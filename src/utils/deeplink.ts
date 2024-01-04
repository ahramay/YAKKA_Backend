import config from "./config";

export const generateDeepLink = (
	routeName: string,
	routeParams: Record<string, any>
) => {
	// Join the query params to the route
	const route = `${config.APP_URL_SCHEME}${routeName}?${new URLSearchParams(
		routeParams
	)}`;

	return route;
};
