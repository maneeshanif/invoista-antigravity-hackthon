`Concierge could not locate any available professionals in your area.` If the LLM fails to locate anyone it just stops.


# Issue
If i requested for someone and if they aren't available (i.e. in the db, it didn't find the slot for them) it just throws the error (pasted above). which isn't a nice user experience, it should cross question to find someone else (in this case). And it will the user who rejected the booking. 