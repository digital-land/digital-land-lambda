const mockPostMessage = jest.fn();
const mockUpdate = jest.fn();

jest.mock('@slack/web-api', () => ({
    WebClient: jest.fn().mockImplementation(() => ({
        chat: {postMessage: mockPostMessage, update: mockUpdate},
    })),
}));

const {WebClient} = require('@slack/web-api');
const {sendMessage} = require('./helpers');

process.env.SLACK_CHANNEL = 'dl-developers';
process.env.APPLICATION_NAME = 'status';
process.env.STAGE = 'temporary';

beforeEach(() => {
    jest.clearAllMocks();
});

describe('sendMessage', () => {
    test('posts a new message for the first event and records its id', async () => {
        mockPostMessage.mockResolvedValue({ok: true, ts: '111.222', channel: 'C123'});
        const Events = [{Region: 'eu-west-2', State: 'started', Type: 'deployment', Timestamp: Date.now()}];

        await sendMessage('xoxb-token', 'status', 'd-ABC', Events, 'deployment');

        expect(WebClient).toHaveBeenCalledWith('xoxb-token');
        expect(mockPostMessage).toHaveBeenCalledWith(expect.objectContaining({channel: 'dl-developers'}));
        expect(mockUpdate).not.toHaveBeenCalled();
        expect(Events[0]).toEqual(expect.objectContaining({SlackMessageId: '111.222', SlackChannelId: 'C123'}));
    });

    test('updates the existing message for later events', async () => {
        mockUpdate.mockResolvedValue({ok: true});
        const Events = [
            {Region: 'eu-west-2', State: 'started', Type: 'deployment', Timestamp: Date.now(), SlackMessageId: '111.222', SlackChannelId: 'C123'},
            {Region: 'eu-west-2', State: 'completed', Type: 'deployment', Timestamp: Date.now()},
        ];

        await sendMessage('xoxb-token', 'status', 'd-ABC', Events, 'deployment');

        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ts: '111.222', channel: 'C123'}));
        expect(mockPostMessage).not.toHaveBeenCalled();
        expect(Events[1]).toEqual(expect.objectContaining({SlackMessageId: '111.222', SlackChannelId: 'C123'}));
    });
});
