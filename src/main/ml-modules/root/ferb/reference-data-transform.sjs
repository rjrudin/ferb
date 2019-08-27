function transform(content, context) {
	const newDoc = content.value.toObject();

	const keys = Object.keys(newDoc);

	newDoc.ReferenceDataCode = newDoc[keys[0]];
	newDoc.ReferenceDataValue = newDoc[keys[1]];

	const tokens = content.uri.split("/");
	newDoc.ReferenceDataType = tokens[tokens.length - 1].split(".")[0];

	content.value = newDoc;
	return content;
}

exports.transform = transform;
