const AWS = require('aws-sdk-mock');
const {handler} = require("./process-logs");
const zlib = require("zlib");
const util = require('util');

const gzip = util.promisify(zlib.gzip);

process.env.TARGET_LOG_GROUP = 'test-log-group';
const testEvent = {
    Records: [
        {
            s3: {
                bucket: {name: "test-s3-bucket", arn: "arn:aws:s3:::test-s3-bucket"},
                object: {key: "one.log"}
            }
        },
        {
            s3: {
                bucket: {name: "test-s3-bucket", arn: "arn:aws:s3:::test-s3-bucket"},
                object: {key: "two.log"}
            }
        },
    ]
};

const testLogFileOne = "#Version: 1.0\n" +
    "#Fields: date time x-edge-location sc-bytes c-ip cs-method cs(Host) cs-uri-stem sc-status cs(Referer) cs(User-Agent) cs-uri-query cs(Cookie) x-edge-result-type x-edge-request-id x-host-header cs-protocol cs-bytes time-taken x-forwarded-for ssl-protocol ssl-cipher x-edge-response-result-type cs-protocol-version fle-status fle-encrypted-fields c-port time-to-first-byte x-edge-detailed-result-type sc-content-type sc-content-len sc-range-start sc-range-end\n" +
    "2019-12-04\t21:02:31\tLAX1\t392\t192.0.2.100\tGET\td111111abcdef8.cloudfront.net\t/index.html\t200\t-\tMozilla/5.0%20(Windows%20NT%2010.0;%20Win64;%20x64)%20AppleWebKit/537.36%20(KHTML,%20like%20Gecko)%20Chrome/78.0.3904.108%20Safari/537.36\t-\t-\tHit\tSOX4xwn4XV6Q4rgb7XiVGOHms_BGlTAC4KyHmureZmBNrjGdRLiNIQ==\td111111abcdef8.cloudfront.net\thttps\t23\t0.001\t-\tTLSv1.2\tECDHE-RSA-AES128-GCM-SHA256\tHit\tHTTP/2.0\t-\t-\t11040\t0.001\tHit\ttext/html\t78\t-\t-\n" +
    "2019-12-04\t21:02:32\tLAX1\t392\t192.0.2.100\tGET\td111111abcdef8.cloudfront.net\t/index.html\t200\t-\tMozilla/5.0%20(Windows%20NT%2010.0;%20Win64;%20x64)%20AppleWebKit/537.36%20(KHTML,%20like%20Gecko)%20Chrome/78.0.3904.108%20Safari/537.36\t-\t-\tHit\tf37nTMVvnKvV2ZSvEsivup_c2kZ7VXzYdjC-GUQZ5qNs-89BlWazbw==\td111111abcdef8.cloudfront.net\thttps\t23\t0.001\t-\tTLSv1.2\tECDHE-RSA-AES128-GCM-SHA256\tHit\tHTTP/2.0\t-\t-\t11040\t0.001\tHit\ttext/html\t78\t-\t-\n" +
    "2019-12-04\t21:02:31\tLAX1\t392\t192.0.2.100\tGET\td111111abcdef8.cloudfront.net\t/index.html\t200\t-\tMozilla/5.0%20(Windows%20NT%2010.0;%20Win64;%20x64)%20AppleWebKit/537.36%20(KHTML,%20like%20Gecko)%20Chrome/78.0.3904.108%20Safari/537.36\t-\t-\tHit\tk6WGMNkEzR5BEM_SaF47gjtX9zBDO2m349OY2an0QPEaUum1ZOLrow==\td111111abcdef8.cloudfront.net\thttps\t23\t0.000\t-\tTLSv1.2\tECDHE-RSA-AES128-GCM-SHA256\tHit\tHTTP/2.0\t-\t-\t11040\t0.000\tHit\ttext/html\t78\t-\t-\n";
let testLogFileOneGzipped;

const testLogFileTwo = "#Version: 1.0\n" +
    "#Fields: date time x-edge-location sc-bytes c-ip cs-method cs(Host) cs-uri-stem sc-status cs(Referer) cs(User-Agent) cs-uri-query cs(Cookie) x-edge-result-type x-edge-request-id x-host-header cs-protocol cs-bytes time-taken x-forwarded-for ssl-protocol ssl-cipher x-edge-response-result-type cs-protocol-version fle-status fle-encrypted-fields c-port time-to-first-byte x-edge-detailed-result-type sc-content-type sc-content-len sc-range-start sc-range-end\n" +
    "2019-12-13\t22:36:26\tSEA19-C1\t900\t192.0.2.200\tGET\td111111abcdef8.cloudfront.net\t/\t502\t-\tMozilla/5.0%20(Windows%20NT%2010.0;%20Win64;%20x64)%20AppleWebKit/537.36%20(KHTML,%20like%20Gecko)%20Chrome/78.0.3904.108%20Safari/537.36\t-\t-\tError\t3AqrZGCnF_g0-5KOvfA7c9XLcf4YGvMFSeFdIetR1N_2y8jSis8Zxg==\twww.example.com\thttp\t735\t0.107\t-\t-\t-\tError\tHTTP/1.1\t-\t-\t3802\t0.107\tOriginDnsError\ttext/html\t507\t-\t-\n" +
    "2019-12-13\t22:36:27\tSEA19-C1\t900\t192.0.2.200\tGET\td111111abcdef8.cloudfront.net\t/favicon.ico\t502\thttp://www.example.com/\tMozilla/5.0%20(Windows%20NT%2010.0;%20Win64;%20x64)%20AppleWebKit/537.36%20(KHTML,%20like%20Gecko)%20Chrome/78.0.3904.108%20Safari/537.36\t-\t-\tError\t1pkpNfBQ39sYMnjjUQjmH2w1wdJnbHYTbag21o_3OfcQgPzdL2RSSQ==\twww.example.com\thttp\t675\t0.102\t-\t-\t-\tError\tHTTP/1.1\t-\t-\t25260\t0.102\tOriginDnsError\ttext/html\t507\t-\t-\n" +
    "2019-12-13\t22:37:02\tSEA19-C2\t900\t192.0.2.200\tGET\td111111abcdef8.cloudfront.net\t/\t502\t-\tcurl/7.55.1\t-\t-\tError\tkBkDzGnceVtWHqSCqBUqtA_cEs2T3tFUBbnBNkB9El_uVRhHgcZfcw==\twww.example.com\thttp\t387\t0.103\t-\t-\t-\tError\tHTTP/1.1\t-\t-\t12644\t0.103\tOriginDnsError\ttext/html\t507\t-\t-";
let testLogFileTwoGzipped;

// Example event
// {
//   "Records": [
//     {
//       "s3": {
//         "bucket": {
//           "name": "root-domain-www-redirect-temporary-logs"
//         },
//         "object": {
//           "key": "ECQJD11LH1YJU.2022-09-29-14.a37b75d4.gz"
//         }
//       }
//     }
//   ]
// }

const getObject = jest.fn().mockImplementation((params, callback) => {
    const Body = params.Key === 'one.log' ? testLogFileOneGzipped : testLogFileTwoGzipped
    callback(null, {Body});
});
AWS.mock('S3', 'getObject', getObject);

const putLogEvents = jest.fn().mockImplementation((params, callback) => {
    callback(null, {});
});
AWS.mock('CloudWatchLogs', 'putLogEvents', putLogEvents);

const describeLogStreams = jest.fn().mockImplementation((params, callback) => {
    callback(null, {
        logStreams: [{
            logStreamName: 'test-stream',
            uploadSequenceToken: 'test-upload-sequence-token',
        }],
    });
});
AWS.mock('CloudWatchLogs', 'describeLogStreams', describeLogStreams);

const createLogStream = jest.fn().mockImplementation((params, callback) => {
    callback(null, {});
});
AWS.mock('CloudWatchLogs', 'createLogStream', createLogStream);

describe('processing a new log object', () => {
    beforeAll(async () => {
        testLogFileOneGzipped = await gzip(testLogFileOne);
        testLogFileTwoGzipped = await gzip(testLogFileTwo);
        await handler(testEvent, {awsRequestId: 'test-id'});
    });

    test('calls s3.getObject with input key and bucket name for record 0', () => {
        expect(getObject).toHaveBeenCalledWith({Bucket: 'test-s3-bucket', Key: 'one.log'}, expect.any(Function));
    });

    test('calls s3.getObject with input key and bucket name for record 1', () => {
        expect(getObject).toHaveBeenCalledWith({Bucket: 'test-s3-bucket', Key: 'two.log'}, expect.any(Function));
    });

    test('calls cloudWatchLogs.createLogStream with the target group name and correct log stream name', () => {
        expect(createLogStream).toHaveBeenCalledWith({
            logGroupName: 'test-log-group',
            logStreamName: 'test-id'
        }, expect.any(Function));
    });

    test('calls cloudWatchLogs.describeLogStreams with the target group name', () => {
        expect(describeLogStreams).toHaveBeenCalledWith({
            logGroupName: 'test-log-group',
            logStreamNamePrefix: 'test-id'
        }, expect.any(Function));
    });

    test('calls cloudWatchLogs.putLogEvents with correct number of logEvents', () => {
        expect(putLogEvents.mock.calls[putLogEvents.mock.calls.length - 1][0].logEvents).toHaveLength(6)
    });

    test('calls cloudWatchLogs.putLogEvents with correct logEvents, logGroupName, logStreamName and sequenceToken', () => {
        expect(putLogEvents).toHaveBeenCalledWith({
            logEvents: expect.arrayContaining([expect.objectContaining({
                timestamp: 1575493351000,
                message: "{\"date\":\"2019-12-04\",\"time\":\"21:02:31\",\"x-edge-location\":\"LAX1\",\"sc-bytes\":\"392\",\"c-ip\":\"192.0.2.100\",\"cs-method\":\"GET\",\"cs(Host)\":\"d111111abcdef8.cloudfront.net\",\"cs-uri-stem\":\"/index.html\",\"sc-status\":\"200\",\"cs(Referer)\":\"-\",\"cs(User-Agent)\":\"Mozilla/5.0%20(Windows%20NT%2010.0;%20Win64;%20x64)%20AppleWebKit/537.36%20(KHTML,%20like%20Gecko)%20Chrome/78.0.3904.108%20Safari/537.36\",\"cs-uri-query\":\"-\",\"cs(Cookie)\":\"-\",\"x-edge-result-type\":\"Hit\",\"x-edge-request-id\":\"SOX4xwn4XV6Q4rgb7XiVGOHms_BGlTAC4KyHmureZmBNrjGdRLiNIQ==\",\"x-host-header\":\"d111111abcdef8.cloudfront.net\",\"cs-protocol\":\"https\",\"cs-bytes\":\"23\",\"time-taken\":\"0.001\",\"x-forwarded-for\":\"-\",\"ssl-protocol\":\"TLSv1.2\",\"ssl-cipher\":\"ECDHE-RSA-AES128-GCM-SHA256\",\"x-edge-response-result-type\":\"Hit\",\"cs-protocol-version\":\"HTTP/2.0\",\"fle-status\":\"-\",\"fle-encrypted-fields\":\"-\",\"c-port\":\"11040\",\"time-to-first-byte\":\"0.001\",\"x-edge-detailed-result-type\":\"Hit\",\"sc-content-type\":\"text/html\",\"sc-content-len\":\"78\",\"sc-range-start\":\"-\",\"sc-range-end\":\"-\"}",
            })]),
            logGroupName: 'test-log-group',
            logStreamName: 'test-stream',
            sequenceToken: 'test-upload-sequence-token',
        }, expect.any(Function));
    });

    test('calls cloudWatchLogs.putLogEvents with logEvents in chronological order', () => {
        expect(putLogEvents).toHaveBeenCalledWith(expect.objectContaining({
            logEvents: [
                expect.objectContaining({timestamp: 1575493351000}),
                expect.objectContaining({timestamp: 1575493351000}),
                expect.objectContaining({timestamp: 1575493352000}),
                expect.objectContaining({timestamp: 1576276586000}),
                expect.objectContaining({timestamp: 1576276587000}),
                expect.objectContaining({timestamp: 1576276622000}),
            ],
        }), expect.any(Function));
    });
});
