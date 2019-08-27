const ferb = require('/ferb/ferb-lib.sjs');
const DataHub = require("/data-hub/5/datahub.sjs");
const datahub = new DataHub();

function main(batch, options) {

	const contentArray = [];
	const instances = [];

	for (let content of batch) {
		let id = content.uri;

		if (!fn.docAvailable(id)) {
			datahub.debug.log({message: 'The document with the uri: ' + id + ' could not be found.', type: 'error'});
			throw Error('The document with the uri: ' + id + ' could not be found.');
		}

		let doc = content.value;

		if (doc && (doc instanceof Document || doc instanceof XMLDocument)) {
			doc = fn.head(doc.root);
		}

		let instance = datahub.flow.flowUtils.getInstance(doc).toObject() || {};
		instances.push(instance);

		let triples = datahub.flow.flowUtils.getTriples(doc) || [];
		let headers = datahub.flow.flowUtils.getHeaders(doc) || {};

		const entityType = options.genericHarmonize.entity.type;
		const entityVersion = options.genericHarmonize.entity.version;
		let wrappedInstance = {
			"info": {
				"title": entityType,
				"version": entityVersion
			}
		};
		wrappedInstance[entityType] = instance;

		content.value = datahub.flow.flowUtils.makeEnvelope(wrappedInstance, headers, triples, "json");
		contentArray.push(content);
	}

	ferb.addReferenceDataValues(instances, options.genericHarmonize.referenceDataMappings);

	if (options.genericHarmonize.childQueries != null) {
		for (childQuery of options.genericHarmonize.childQueries) {
			ferb.addChildDocuments(instances, childQuery);
		}
	}

	return contentArray;
}

module.exports = {
	main: main
};
