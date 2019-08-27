declareUpdate();

var uris; // an array of URIs (may only be one) being processed
var content; // an array of objects for each document being processed
var options; // the options object passed to the step by DHF
var flowName; // the name of the flow being processed
var stepNumber; // the index of the step within the flow being processed; the first step has a step number of 1
var step; // the step definition object

for (const contentObject of content) {
	const order = contentObject.value;
	const instance = order.envelope.instance;

	const tokens = contentObject.uri.split("/");
	const recordType = tokens[tokens.length - 1].split(".")[0];

	contentObject.uri = contentObject.uri.replace("/raw/", "/" + recordType + "/");
	contentObject.context.collections = ["raw", recordType];
}
