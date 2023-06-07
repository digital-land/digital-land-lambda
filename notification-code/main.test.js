const AWSMock = require('aws-sdk-mock');
const {handler} = require("./main");
const {successfulDeployment, failedDeployment} = require("./test-cases");
const {getSlackBotToken} = require("./helpers");

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
}));

describe('a successful deployment', function () {
    beforeAll(async () => {
        for (let index in successfulDeployment) {
            await handler(successfulDeployment[index])
        }
    });

    test('calls getSlackBotToken', () => {
        expect(getSlackBotToken).toHaveBeenCalled();
    });
});

describe('an unsuccessful deployment', function () {
    beforeAll(async () => {
        for (let index in failedDeployment) {
            await handler(failedDeployment[index])
        }
    });

    test('calls getSlackBotToken', () => {
        expect(getSlackBotToken).toHaveBeenCalled();
    });
});
