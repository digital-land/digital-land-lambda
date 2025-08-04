const {SSM, DynamoDB} = require("aws-sdk");
const {WebClient} = require("@slack/web-api");

module.exports = {
    getSlackBotToken: async () => {
        const client = new SSM();
        const {Parameter: {Value: slackBotToken}} = await client.getParameter({
            Name: process.env.PARAM_SLACK_BOT_TOKEN,
            WithDecryption: true,
        }).promise();

        return slackBotToken;
    },
    getDeploymentDetails: async (DeploymentId) => {
        const client = new DynamoDB.DocumentClient();
        const { Item } = await client.get({
            TableName: process.env.DEPLOYMENT_TABLE,
            Key: { DeploymentId },
            ConsistentRead: true, // ✅ force most up-to-date read
        }).promise();
        return Item;
    },
    setDeploymentDetails: async (Item) => {
        const client = new DynamoDB.DocumentClient();
        await client.put({
            TableName: process.env.DEPLOYMENT_TABLE,
            Item,
        }).promise();
    },
    sendMessage: async (slackBotToken, Application, DeploymentId, Events, Type) => {
        const slack = new WebClient(slackBotToken);
        const ThisEvent = Events[Events.length - 1];

        // ✅ Reuse the first event with Slack metadata
        const ExistingSlackEvent = Events.find(
            e => e.SlackMessageId && e.SlackChannelId
        );

        const headerEmoji = Type === 'deployment'
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
            { type: "divider" },
        ];

        Events.forEach(Event => {
            const EventTime = new Date(Event.Timestamp).toLocaleTimeString();
            const spacing = new Array(11 - EventTime.length).fill(' ').join('');
            const EventType = Event.Type.charAt(0).toUpperCase() + Event.Type.slice(1);

            MessageBlocks.push({
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `${EventTime}${spacing} ${EventType}: *${Event.State}*`
                }
            });
        });

        MessageBlocks.push({ type: "divider" });
        MessageBlocks.push({
            type: "section",
            text: {
                type: "mrkdwn",
                text: `Login to AWS to view the <https://${Events[0].Region}.console.aws.amazon.com/codesuite/codedeploy/deployments/${DeploymentId}|details>.`,
            },
        });

        const EventMessage = `${Type.charAt(0).toUpperCase() + Type.slice(1)} ${DeploymentId} for ${Application} (${ThisEvent.State})`;

        if (ExistingSlackEvent) {
            // ✅ Update existing message
            const result = await slack.chat.update({
                text: EventMessage,
                blocks: MessageBlocks,
                ts: ExistingSlackEvent.SlackMessageId,
                channel: ExistingSlackEvent.SlackChannelId,
                icon_emoji: ':rocket:',
                username: 'DeployBot',
            });

            ThisEvent.SlackMessageId = result.ts || ExistingSlackEvent.SlackMessageId;
            ThisEvent.SlackChannelId = result.channel || ExistingSlackEvent.SlackChannelId;
        } else {
            // ✅ Post new message
            const result = await slack.chat.postMessage({
                text: EventMessage,
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
