export const getPaginatedPayload = (dataArray, page, limit, totalItems) => {
	const totalPages = Math.ceil(totalItems / limit);

	const payload = {
		page,
		limit,
		totalPages,
		previousPage: page > 1,
		nextPage: page < totalPages,
		totalItems,
		currentPageItems: dataArray.length,
		data: dataArray,
	};
	return payload;
};
export const userSearchConditions = (query) => {
	const conditions = {};

	// Define your search query conditions
	if (query.firstName) {
		conditions.firstName = new RegExp(query.firstName, 'i');
	}
	if (query.lastName) {
		conditions.lastName = new RegExp(query.lastName, 'i');
	}
	if (query.phone) {
		conditions.phone = query.phone;
	}
	if (query.email) {
		conditions.email = new RegExp(query.email, 'i');
	}
	if (query.username) {
		conditions.username = new RegExp(query.username, 'i');
	}
	if (query.role) {
		conditions.role = query.role;
	}

	return conditions;
};
// transaction
export const transactionSearchConditions = (query) => {
	const conditions = {};

	// Define your search query conditions
	if (query.bank) {
		conditions.firstName = new RegExp(query.bank, 'i');
	}
	if (query.type) {
		conditions.lastName = new RegExp(query.type, 'i');
	}
	if (query.status) {
		conditions.status = new RegExp(query.status, 'i');
	}
	if (query.amount) {
		conditions.amount = query.amount;
	}

	return conditions;
};
