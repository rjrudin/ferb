function addReferenceDataValues(instances) {
	const referenceDataQueries = buildReferenceDataQueries(instances);
	const referenceDataMap = buildReferenceDataMap(referenceDataQueries);
	applyReferenceDataMapToInstances(referenceDataMap, instances);
}

// Returns an array of AND queries, one for each reference data property on each instance.
function buildReferenceDataQueries(instances) {
	const referenceDataQueries = [];
	for (let instance of instances) {
		for (let propertyName of Object.keys(instance)) {
			if (propertyName.slice(propertyName.length - 3, propertyName.length) == '_CD') {
				let codeName = propertyName.slice(0, propertyName.length - 3);
				let referenceDataType = "RF_" + codeName;
				if (REF_DATA_MAPPING[propertyName] != null) {
					referenceDataType = REF_DATA_MAPPING[propertyName];
				}
				referenceDataQueries.push(cts.andQuery([
					cts.jsonPropertyRangeQuery("ReferenceDataType", "=", referenceDataType),
					cts.jsonPropertyRangeQuery("ReferenceDataCode", "=", instance[propertyName].trim())
				]));
			}
		}
	}
	return referenceDataQueries;
}

// Returns a JSON object with a key for each ReferenceDataType returned by the given queries. Each key is associated
// with an object that has a key for each ReferenceDataCode returned by the given queries. The value of each of those
// keys is the corresponding ReferenceDataValue. The returned JSON object can then be used for fast conversion of
// reference data codes into values, all via a single query.
function buildReferenceDataMap(referenceDataQueries) {
	const tuples = cts.valueTuples(
		[
			cts.elementReference(xs.QName("ReferenceDataType")),
			cts.elementReference(xs.QName("ReferenceDataCode")),
			cts.elementReference(xs.QName("ReferenceDataValue"))
		], null,
		cts.andQuery([
			cts.collectionQuery("ReferenceData"),
			cts.orQuery(referenceDataQueries)
		])
	);

	const referenceDataMap = {};
	for (let tuple of tuples) {
		let type = tuple[0];
		let typeMap = referenceDataMap[type];
		if (typeMap == null) {
			typeMap = {};
			referenceDataMap[type] = typeMap;
		}
		let code = tuple[1];
		typeMap[code] = tuple[2];
	}
	return referenceDataMap;
}

// Given the JSON object returned by buildReferenceDataMap, this converts each reference data property from a code into
// a value without any additional queries.
function applyReferenceDataMapToInstances(referenceDataMap, instances) {
	for (let instance of instances) {
		for (let propertyName of Object.keys(instance)) {
			if (propertyName.slice(propertyName.length - 3, propertyName.length) == '_CD') {
				let codeName = propertyName.slice(0, propertyName.length - 3);
				let type = "RF_" + codeName;
				if (REF_DATA_MAPPING[propertyName] != null) {
					type = REF_DATA_MAPPING[propertyName];
				}
				let typeMap = referenceDataMap[type];
				if (typeMap != null) {
					let code = instance[propertyName];
					let value = typeMap[code];
					if (value != null) {
						instance[codeName] = value;
					}
				}
			}
		}
	}
}

/**
 * Adds an array of child documents to each instance, where the array is constructed by on the given config. The config
 * object is expected to have the following fields:
 *
 * - childCollection = the name of the collection containing child documents
 * - childPropertyName = the name of the property used to constrain the query for child documents
 * - newPropertyName = the name of the new property to add to each instance
 * - childPropertyHasRangeIndex = true if a range index exists for the child property
 */
function addChildDocuments(instances, config) {
	const childCollection = config.childCollection;
	const childPropertyName = config.childPropertyName;
	const newPropertyName = config.newPropertyName;
	const childPropertyHasRangeIndex = config.childPropertyHasRangeIndex;
	const addChildReferenceDataValues = config.addChildReferenceDataValues != false;

	// Build an array of values of the given child property, found across all instances
	const childValues = [];
	for (let instance of instances) {
		const childValue = instance[childPropertyName];
		if (childValue !== null && childValue !== undefined) {
			childValues.push(childValue);
		}
	}

	// Find all the matching child documents
	const childPropertyQuery = childPropertyHasRangeIndex ?
		cts.jsonPropertyRangeQuery(childPropertyName, "=", childValues) :
		cts.jsonPropertyValueQuery(childPropertyName, childValues);
	const childDocs = cts.search(cts.andQuery([
		cts.collectionQuery(childCollection),
		childPropertyQuery
	]));

	// Build an array and map of child document instances.
	// The array is needed so that reference data properties can be quickly mapped across all child instances.
	// The map is needed for quickly associating child instances with a parent instance.
	let childInstances = [];
	let childInstanceMap = {};
	for (let childDoc of childDocs) {
		let childInstance = childDoc.toObject().envelope.instance;
		childInstances.push(childInstance);

		let childPropertyValue = childInstance[childPropertyName];
		let childArray = childInstanceMap[childPropertyValue];
		if (childArray == null) {
			childArray = [];
			childInstanceMap[childPropertyValue] = childArray;
		}
		childArray.push(childInstance);
	}

	// Add reference data values to the child instances
	if (addChildReferenceDataValues) {
		addReferenceDataValues(childInstances);
	}

	// And then associate parent instances with arrays of child instances
	for (let instance of instances) {
		let instanceValue = instance[childPropertyName];
		if (instanceValue !== null && instanceValue !== undefined) {
			let childInstances = childInstanceMap[instanceValue];
			if (childInstances !== null && childInstances !== undefined) {
				instance[newPropertyName] = childInstances;
			}
		}
	}
}
