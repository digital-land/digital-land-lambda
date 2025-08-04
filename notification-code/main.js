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
    const codedeploy = new CodeDeploy({ apiVersion: '2014-10-06' });
    const slackBotToken = await getSlackBotToken();

    const DeploymentId = event.DeploymentId;
    const lifecycleEventHookExecutionId = event.LifecycleEventHookExecutionId;
    const Application = process.env.APPLICATION_NAME;
    const Type = 'deployment'; // or 'lifecycle' if you want to differentiate

    // ✅ Get latest deployment state (strongly consistent)
    const DeploymentDetails = await getDeploymentDetails(DeploymentId);
    const Events = DeploymentDetails?.Events || [];

    // ✅ Get ECS target ID
    const deploymentTargets = await codedeploy.listDeploymentTargets({
        deploymentId: DeploymentId,
    }).promise();

    const targetId = deploymentTargets.targetIds[0];
    if (!targetId) {
        console.warn(`No target found for deployment ${DeploymentId}`);
        return;
    }

    const deploymentTarget = await codedeploy.getDeploymentTarget({
        deploymentId: DeploymentId,
        targetId: targetId,
    }).promise();

    const lifecycleEvents = deploymentTarget?.deploymentTarget?.ecsTarget?.lifecycleEvents || [];

    const lastSucceeded = [...lifecycleEvents].reverse().find(e => e.status === 'Succeeded');
    if (!lastSucceeded) {
        console.warn(`No successful lifecycle event yet for ${DeploymentId}`);
        return;
    }

    // ✅ Map lifecycle event to readable state
    let State = lastSucceeded.lifecycleEventName;
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
    }

    // ✅ Deduplicate state
    const alreadyLogged = Events.some(e => e.State === State && e.Type === Type);
    if (alreadyLogged) {
        console.log(`State '${State}' already logged for ${DeploymentId}, skipping.`);
        return;
    }

    Events.push({
        Region: process.env.AWS_REGION || 'us-east-1', // fallback if not included
        State,
        Type,
        Timestamp: Date.now(),
    });

    // ✅ Send/update Slack message
    await sendMessage(slackBotToken, Application, DeploymentId, Events, Type);

    // ✅ Save updated event list (including Slack metadata)
    await setDeploymentDetails({ DeploymentId, Events });

    // ✅ Notify CodeDeploy that the hook succeeded
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
