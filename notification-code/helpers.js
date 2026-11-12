// AWS SDK v3 is provided by the Lambda Node.js runtime, so it is not bundled in the deployment zip.
const {SSMClient, GetParameterCommand} = require("@aws-sdk/client-ssm");
const {DynamoDBClient} = require("@aws-sdk/client-dynamodb");
const {DynamoDBDocumentClient, GetCommand, PutCommand} = require("@aws-sdk/lib-dynamodb");
const {WebClient} = require("@slack/web-api");

const ssm = new SSMClient({});
const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));

module.exports = {
    getSlackBotToken: async () => {
        const {Parameter: {Value: slackBotToken}} = await ssm.send(new GetParameterCommand({
            Name: process.env.PARAM_SLACK_BOT_TOKEN,
            WithDecryption: true,
        }));

        return slackBotToken;
    },
    getDeploymentDetails: async (DeploymentId) => {
        const {Item} = await dynamo.send(new GetCommand({
            TableName: process.env.DEPLOYMENT_TABLE,
            Key: {DeploymentId},
        }));

        return Item;
    },
    setDeploymentDetails: async (Item) => {
        await dynamo.send(new PutCommand({
            TableName: process.env.DEPLOYMENT_TABLE,
            Item,
        }));
    },
    sendMessage: async (slackBotToken, Application, DeploymentId, Events, Type) => {
        const slack = new WebClient(slackBotToken);
        const LastEvent = Events[Events.length - 2];
        const ThisEvent = Events[Events.length - 1];

        const TypeMessage = Type.charAt(0).toUpperCase() + Type.slice(1);
        const EventMessage = `${TypeMessage} ${DeploymentId} for ${Application} (${ThisEvent.State})`;
        const EventMessageMarkdown = `${Type.charAt(0).toUpperCase() + Type.slice(1)} ${DeploymentId} for ${Application} (${ThisEvent.State})`;

        const invalidationHeaderEmoji = ThisEvent.State === 'completed'
            ? ':white_check_mark:'
            : ThisEvent.State === 'failed'
                ? ':no_entry_sign:'
                : ':hourglass_flowing_sand:';
        const headerEmoji = Type === 'invalidation'
            ? invalidationHeaderEmoji
            : Type === 'deployment'
                ? (ThisEvent.State === 'completed' ? ':white_check_mark:' : ':hourglass_flowing_sand:')
                : ':no_entry_sign:';

        const MessageBlocks = [
            {
                type: "header",
                text: {
                    type: "plain_text",
                    text: `Deploying ${process.env.APPLICATION_NAME} to ${process.env.STAGE} environment ${headerEmoji}`,
                    emoji: true,
                },
            },
            {type: "divider"}
        ];

        Events.forEach(Event => {
            const TypeMessage = Event.Type.charAt(0).toUpperCase() + Event.Type.slice(1);

            const EventTimestamp = new Date(Event.Timestamp).toLocaleTimeString()
            const spacing = new Array(11 - EventTimestamp.length).fill(' ').join('')

            MessageBlocks.push({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": `${EventTimestamp}${spacing} ${TypeMessage}: *${Event.State}*`
                }
            });
        });

        MessageBlocks.push({type: "divider"});
        MessageBlocks.push({
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": `Login to AWS to view the <https://${Events[0].Region}.console.aws.amazon.com/codesuite/codedeploy/deployments/${DeploymentId}|details>.`,
            },
        });

        if (LastEvent) {
            await slack.chat.update({
                text: EventMessage,
                mrkdwn: EventMessageMarkdown,
                blocks: MessageBlocks,
                ts: LastEvent.SlackMessageId,
                channel: LastEvent.SlackChannelId,
                icon_emoji: ':rocket:',
                username: 'DeployBot',
            });
            ThisEvent.SlackMessageId = LastEvent.SlackMessageId;
            ThisEvent.SlackChannelId = LastEvent.SlackChannelId;
        } else {
            const result = await slack.chat.postMessage({
                text: EventMessage,
                mrkdwn: EventMessageMarkdown,
                blocks: MessageBlocks,
                channel: process.env.SLACK_CHANNEL,
                icon_emoji: ':rocket:',
                username: 'DeployBot',
            });
            ThisEvent.SlackMessageId = result.ts;
            ThisEvent.SlackChannelId = result.channel;
        }
    },
};
