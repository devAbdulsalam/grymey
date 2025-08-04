/**
 * @type {{ SUPER_ADMIN: 'SUPER_ADMIN', ADMIN: "ADMIN"; USER: "USER"} as const}
 */
export const UserRolesEnum = {
	SUPER_ADMIN: 'SUPER_ADMIN',
	ADMIN: 'ADMIN',
	TEACHER: 'TEACHER',
	STUDENT: 'STUDENT',
	SCHOOL: 'SCHOOL',
	ADMIN: 'ADMIN',
	USER: 'USER',
	PUBLISHER: 'PUBLISHER',
	AUTHOR: 'AUTHOR'
};

export const AvailableUserRoles = Object.values(UserRolesEnum);

/**
 * @type {{ GOOGLE: "GOOGLE"; GITHUB: "GITHUB"; EMAIL_PASSWORD: "EMAIL_PASSWORD"} as const}
 */
export const UserLoginType = {
	GOOGLE: 'GOOGLE',
	GITHUB: 'GITHUB',
	EMAIL_PASSWORD: 'EMAIL_PASSWORD',
};

export const AvailableSocialLogins = Object.values(UserLoginType);


export const USER_TEMPORARY_TOKEN_EXPIRY = 20 * 60 * 1000; // 20 minutes
