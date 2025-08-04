const {WebClient} = require("@slack/web-api");
const {CodeDeploy} = require("aws-sdk");
const {getSlackBotToken, getDeploymentDetails, setDeploymentDetails, sendMessage} = require('./helpers')

const handleCodeDeployEvent = async (event) => {
    const slackBotToken = await getSlackBotToken();

    for (const record of event.Records) {
        const recordMessage = JSON.parse(record.Sns.Message);
        let DeploymentId = recordMessage.deploymentId;
        let Type = 'deployment';
        const Application = process.env.APPLICATION_NAME;

        const isRollback = recordMessage.hasOwnProperty('rollbackInformation') &&
            Object.entries(JSON.parse(recordMessage.rollbackInformation)).length;

        if (isRollback) {
            const rollbackInfo = JSON.parse(recordMessage.rollbackInformation);
            DeploymentId = rollbackInfo.RollbackTriggeringDeploymentId;
            Type = 'rollback';
        }

        const DeploymentDetails = await getDeploymentDetails(DeploymentId);
        const Events = DeploymentDetails?.Events || [];

        let State = recordMessage.status.toLowerCase().replace('_', '');

        switch (State) {
            case 'created':
                State = 'started';
                break;
            case 'aborted':
                State = 'cancelled';
                break;
            case 'succeeded':
                State = 'completed';
                break;
        }

        // ✅ Avoid duplicate 'started' states
        if (State === 'started' && Events.some(e => e.State === 'started')) {
            console.log(`Skipping duplicate 'started' for ${DeploymentId}`);
            return;
        }

        Events.push({
            Region: recordMessage.region,
            State,
            Type,
            Timestamp: Date.now(),
        });

        // ✅ Send/update Slack message
        await sendMessage(slackBotToken, Application, DeploymentId, Events, Type);

        // ✅ Save updated events (including Slack metadata)
        await setDeploymentDetails({ DeploymentId, Events });
    }
};


const handleCodeDeployLifeCycleEvent = async (event) => {
    const codedeploy = new CodeDeploy({apiVersion: '2014-10-06'});
    const slackBotToken = await getSlackBotToken();
    const DeploymentId = event.DeploymentId;
    const lifecycleEventHookExecutionId = event.LifecycleEventHookExecutionId;

    const deploymentTargets = await codedeploy.listDeploymentTargets({
        deploymentId: DeploymentId,
    }).promise();

    console.log(JSON.stringify(deploymentTargets));

    const deploymentTarget = await codedeploy.getDeploymentTarget({
        deploymentId: DeploymentId,
        targetId: deploymentTargets.targetIds[0],
    }).promise();

    console.log(JSON.stringify(deploymentTarget));

    let Type = 'deployment';
    let Application = process.env.APPLICATION_NAME;

    const DeploymentDetails = await getDeploymentDetails(DeploymentId);
    const Events = DeploymentDetails ? DeploymentDetails.Events : [];

    const lastSuccessEvent = deploymentTarget.deploymentTarget.ecsTarget.lifecycleEvents
        .reverse()
        .find(e => e.status === 'Succeeded');

    let State = lastSuccessEvent.lifecycleEventName;

    switch (State) {
        case 'Install':
            State = 'replacement service running';
            break;
        case 'AfterInstall':
            State = 'replacement service accepting 20% traffic';
            break;
        case 'AllowTraffic':
            State = 'replacement service accepting 100% traffic';
            break;
        default:
            break;
    }

    // const alreadyRecorded = Events.some(e => e.State === State && e.Type === Type);
    // if (alreadyRecorded) {
    //     console.log('Skipping duplicate state: ${State} for deployment ${DeploymentId}');
    //     return;
    // }

    if (State === 'started' && Events.some(e => e.State === 'started' && e.Type === Type)) {
        console.log('Duplicate started state for ${DeploymentId}, skipping.');
        return;
    }

    Events.push({
        Region: Events[0].Region,
        State,
        Type,
        Timestamp: Date.now(),
    });

    await sendMessage(slackBotToken, Application, DeploymentId, Events, Type);

    await setDeploymentDetails({DeploymentId, Events});

    await codedeploy.putLifecycleEventHookExecutionStatus({
        deploymentId: DeploymentId,
        lifecycleEventHookExecutionId,
        status: 'Succeeded',
    }).promise();
};

module.exports = {
    handler: async (event, context) => {
        console.log(JSON.stringify(event))

        // if (event.Records?.[0]?.hasOwnProperty('Sns')) {
        //     await handleCodeDeployEvent(event, context);
        // }
        // if (event.hasOwnProperty('LifecycleEventHookExecutionId')) {
        //     await handleCodeDeployLifeCycleEvent(event, context);
        // }
        if (event.hasOwnProperty('LifecycleEventHookExecutionId')) {
            await handleCodeDeployLifeCycleEvent(event, context);
        } else if (event.Records?.[0]?.hasOwnProperty('Sns')) {
            await handleCodeDeployEvent(event, context);
        } else {
            console.warn('Unknown event format received. Skipping.');
        }
    }
}
