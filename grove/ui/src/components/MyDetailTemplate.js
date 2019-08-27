import React from 'react';

const MyDetailTemplate = (props) => {
	return (
		<div>
			detail: {props.detail}<br/><br/>
			contentType: {props.contentType}<br/><br/>
			label: {props.label}<br/><br/>
			id: {props.id}<br/><br/>
		</div>
	);
};

export default MyDetailTemplate;
