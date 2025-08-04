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

        const {Item} = await client.get({
            TableName: process.env.DEPLOYMENT_TABLE,
            Key: {DeploymentId},
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
        // const LastEvent = Events[Events.length - 2];
        const LastEvent = [...Events].reverse().find(e => e.SlackMessageId && e.SlackChannelId);
        const ThisEvent = Events[Events.length - 1];

        const TypeMessage = Type.charAt(0).toUpperCase() + Type.slice(1);
        const EventMessage = `${TypeMessage} ${DeploymentId} for ${Application} (${ThisEvent.State})`;
        const EventMessageMarkdown = `${Type.charAt(0).toUpperCase() + Type.slice(1)} ${DeploymentId} for ${Application} (${ThisEvent.State})`;

        const headerEmoji = Type === 'deployment' ? (ThisEvent.State === 'completed' ? ':white_check_mark:' : ':hourglass_flowing_sand:') : ':no_entry_sign:';

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
