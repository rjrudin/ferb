declareUpdate();

var uris; // an array of URIs (may only be one) being processed
var content; // an array of objects for each document being processed
var options; // the options object passed to the step by DHF
var flowName; // the name of the flow being processed
var stepNumber; // the index of the step within the flow being processed; the first step has a step number of 1
var step; // the step definition object

for (const contentObject of content) {
	const instance = contentObject.value.envelope.instance;

	const uriTokens = contentObject.uri.split("/");

	const nameTokens = uriTokens[uriTokens.length - 1].split(".");
	const recordType = nameTokens[0];

	const idTokens = nameTokens[1].split("-");

	// Hack for our fake customers
	let id = idTokens[2];
	const firstKey = Object.keys(instance)[0];
	if (firstKey == "customer_id") {
		id = instance[firstKey];
	}

	contentObject.uri = "/" + recordType + "/" + id + ".json";
	contentObject.context.collections = ["raw", recordType];
}
