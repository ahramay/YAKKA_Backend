import { Client } from "@googlemaps/google-maps-services-js";
const client = new Client();

export default client;

export const createGoogleMapsLink = (lat: number, lng: number) => {
	// Create a short link to the location
	const link = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
	return link;
};
