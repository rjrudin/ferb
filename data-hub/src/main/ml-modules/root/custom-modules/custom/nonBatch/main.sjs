const ferb = require('/ferb/ferb-lib.sjs');
const DataHub = require("/data-hub/5/datahub.sjs");
const datahub = new DataHub();

function main(content, options) {

  let id = content.uri;

  if (!fn.docAvailable(id)) {
    datahub.debug.log({message: 'The document with the uri: ' + id + ' could not be found.', type: 'error'});
    throw Error('The document with the uri: ' + id + ' could not be found.')
  }

  //grab the 'doc' from the content value space
  let doc = content.value;

  // let's just grab the root of the document if its a Document and not a type of Node (ObjectNode or XMLNode)
  if (doc && (doc instanceof Document || doc instanceof XMLDocument)) {
    doc = fn.head(doc.root);
  }

  let instance = datahub.flow.flowUtils.getInstance(doc).toObject() || {};
  let triples = datahub.flow.flowUtils.getTriples(doc) || [];
  let headers = datahub.flow.flowUtils.getHeaders(doc) || {};

  ferb.addReferenceDataValues([instance], options.genericHarmonize.referenceDataMappings);

  if (options.genericHarmonize.childQueries != null) {
    for (childQuery of options.genericHarmonize.childQueries) {
      ferb.addChildDocuments([instance], childQuery);
    }
  }

  const entityType = options.genericHarmonize.entity.type;
  const entityVersion = options.genericHarmonize.entity.version;
  let wrappedInstance = {
    "info": {
      "title": entityType,
      "version": entityVersion
    }
  };
  wrappedInstance[entityType] = instance;

  let envelope = datahub.flow.flowUtils.makeEnvelope(wrappedInstance, headers, triples, "json");

  content.value = envelope;

  return content;
}

module.exports = {
  main: main
};
