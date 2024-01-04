import { format, isToday, isTomorrow } from "date-fns";

export const formatDate = (date: Date | string) => {
	/* 7th April 2022*/
	return format(
		typeof date === "string" ? new Date(date) : date,
		"do MMMM yyyy"
	);
};

export const yakkaDateFormat = (date: Date) => {
	// If the date is today, return the the following string 'Today at 12:00pm'
	if (isToday(date)) {
		return `Today - ${format(date, "h:ma")}`;
	}
	// If the date is tomorrow, return the following string 'Tomorrow at 12:00pm'
	if (isTomorrow(date)) {
		return `Tomorrow - ${format(date, "h:ma")}`;
	}
	// Otherwise, return the following string 'Monday 12th of January at 12:00pm'
	return format(date, "d MMMM yyyy - hh:mma");
};
