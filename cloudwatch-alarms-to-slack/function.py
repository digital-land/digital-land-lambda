import os
import json
import boto3
import urllib3


http = urllib3.PoolManager()


def get_alarm_attributes(sns_message: dict) -> dict:
  alarm = {
      "name": sns_message.get("AlarmName", "Unknown Alarm"),
      "description": sns_message.get("AlarmDescription", ""),
      "reason": sns_message.get("NewStateReason", ""),
      "region": sns_message.get("Region", ""),
      "state": sns_message.get("NewStateValue", ""),
      "previous_state": sns_message.get("OldStateValue", ""),
  }
  return alarm


def register_alarm(alarm: dict) -> dict:
  return {
      "blocks": [
          {
              "type": "header",
              "text": {"type": "plain_text", "text": ":warning: " + alarm["name"] + " alarm was registered"},
          },
          {"type": "divider"},
          {
              "type": "section",
              "text": {"type": "mrkdwn", "text": "_" + alarm["description"] + "_"},
              "block_id": "text1",
          },
          {"type": "divider"},
          {
              "type": "context",
              "elements": [
                  {"type": "mrkdwn", "text": "Region: *" + alarm["region"] + "*"}
              ],
          },
      ]
  }


def activate_alarm(alarm: dict) -> dict:
  return {
      "blocks": [
          {
              "type": "header",
              "text": {"type": "plain_text", "text": ":red_circle: Alarm: " + alarm["name"]},
          },
          {"type": "divider"},
          {
              "type": "section",
              "text": {"type": "mrkdwn", "text": "_" + alarm["reason"] + "_"},
              "block_id": "text1",
          },
          {"type": "divider"},
          {
              "type": "context",
              "elements": [
                  {"type": "mrkdwn", "text": "Region: *" + alarm["region"] + "*"}
              ],
          },
      ]
  }


def resolve_alarm(alarm: dict) -> dict:
  return {
      "blocks": [
          {
              "type": "header",
              "text": {"type": "plain_text", "text": ":large_green_circle: Alarm: " + alarm["name"] + " was resolved"},
          },
          {"type": "divider"},
          {
              "type": "section",
              "text": {"type": "mrkdwn", "text": "_" + alarm["reason"] + "_"},
              "block_id": "text1",
          },
          {"type": "divider"},
          {
              "type": "context",
              "elements": [
                  {"type": "mrkdwn", "text": "Region: *" + alarm["region"] + "*"}
              ],
          },
      ]
  }


def _get_slack_token() -> str:
  # Prefer direct env var, else read via SSM using PARAM_SLACK_BOT_TOKEN
  token = os.environ.get("SLACK_BOT_TOKEN")
  if token:
    return token

  param_name = os.environ.get("PARAM_SLACK_BOT_TOKEN")
  if not param_name:
    raise RuntimeError("No SLACK_BOT_TOKEN or PARAM_SLACK_BOT_TOKEN set")

  ssm = boto3.client("ssm")
  resp = ssm.get_parameter(Name=param_name, WithDecryption=True)
  return resp["Parameter"]["Value"]


def _resolve_channel_id(token: str, channel: str) -> str:
  """
  Minimal resolver to avoid NameError.
  If you pass a channel ID (recommended), this returns it unchanged.
  If you pass a name, Slack may return channel_not_found unless the bot has
  the right scopes and is a member. Prefer channel IDs for reliability.
  """
  return channel


def _post_to_slack(channel: str, blocks: list):
  token = _get_slack_token()
  channel_id = _resolve_channel_id(token, channel)
  payload = {"channel": channel_id, "blocks": blocks, "text": "CloudWatch Alarm"}
  headers = {
      "Authorization": f"Bearer {token}",
      "Content-Type": "application/json; charset=utf-8",
  }
  resp = http.request(
      "POST",
      "https://slack.com/api/chat.postMessage",
      body=json.dumps(payload).encode("utf-8"),
      headers=headers,
  )

  try:
    body = json.loads(resp.data.decode("utf-8"))
  except Exception:
    body = {}

  if resp.status != 200 or not body.get("ok", False):
    raise Exception(f"Slack API error status={resp.status} body={body} channel={channel}")


def lambda_handler(event, context):
  sns_message = json.loads(event["Records"][0]["Sns"]["Message"]) if isinstance(event, dict) else {}
  alarm = get_alarm_attributes(sns_message)

  if alarm["previous_state"] == "INSUFFICIENT_DATA" and alarm["state"] == "OK":
    msg = register_alarm(alarm)
  elif alarm["previous_state"] == "OK" and alarm["state"] == "ALARM":
    msg = activate_alarm(alarm)
  elif alarm["previous_state"] == "ALARM" and alarm["state"] == "OK":
    msg = resolve_alarm(alarm)
  else:
    msg = {
        "blocks": [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"Alarm {alarm['name']} changed: {alarm['previous_state']} -> {alarm['state']}",
                },
            }
        ]
    }

  # This is default channel just a safety net
  channel = os.environ.get("SLACK_CHANNEL", "planning-data-alerts")
  try:
    print({
        "debug": "env_channel",
        "channel_value": channel,
    })
  except Exception:
    pass
  _post_to_slack(channel=channel, blocks=msg["blocks"])
  return {"statusCode": 200}
