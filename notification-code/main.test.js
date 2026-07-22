const AWSMock = require('aws-sdk-mock');
const {handler} = require("./main");
const {successfulDeployment, failedDeployment, cloudfrontInvalidation} = require("./test-cases");
const {getSlackBotToken, sendMessage} = require("./helpers");

process.env.PARAM_SLACK_BOT_TOKEN = '/test-app/notifications/slack-token';
process.env.SLACK_CHANNEL = 'dl-developers';
process.env.APPLICATION_NAME = 'status';
process.env.STAGE = 'temporary';

let mockDeploymentDetails = {};

jest.mock('./helpers', () => ({
    getSlackBotToken: jest.fn().mockResolvedValue('TEST_SLACK_BOT_TOKEN'),
    getDeploymentDetails: jest.fn().mockImplementation(async (DeploymentId) => mockDeploymentDetails[DeploymentId]),
    setDeploymentDetails: jest.fn().mockImplementation(async ({DeploymentId, Events}) => {
        mockDeploymentDetails[DeploymentId] = {DeploymentId, Events}
        console.log(DeploymentId, Events);
    }),
    sendMessage: jest.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
    mockDeploymentDetails = {};
    jest.clearAllMocks();
});

describe('a successful deployment', function () {
    beforeEach(async () => {
        for (let index in successfulDeployment) {
            await handler(successfulDeployment[index])
        }
    });

    test('calls getSlackBotToken', () => {
        expect(getSlackBotToken).toHaveBeenCalled();
    });

    test('keeps existing CodeDeploy events classified as deployment events', () => {
        expect(sendMessage).toHaveBeenLastCalledWith(
            'TEST_SLACK_BOT_TOKEN',
            'status',
            'd-MainDeployment',
            expect.arrayContaining([expect.objectContaining({Type: 'deployment', State: 'completed'})]),
            'deployment',
        );
    });
});

describe('an unsuccessful deployment', function () {
    beforeEach(async () => {
        for (let index in failedDeployment) {
            await handler(failedDeployment[index])
        }
    });

    test('calls getSlackBotToken', () => {
        expect(getSlackBotToken).toHaveBeenCalled();
    });
});

describe('a CloudFront invalidation', function () {
    beforeEach(async () => {
        for (let index in cloudfrontInvalidation) {
            await handler(cloudfrontInvalidation[index]);
        }
    });

    test('adds invalidation events to the existing deployment notification', () => {
        expect(sendMessage).toHaveBeenLastCalledWith(
            'TEST_SLACK_BOT_TOKEN',
            'status',
            'd-MainDeployment',
            [
                expect.objectContaining({Type: 'invalidation', State: 'started'}),
                expect.objectContaining({Type: 'invalidation', State: 'completed'}),
            ],
            'invalidation',
        );
    });
});
