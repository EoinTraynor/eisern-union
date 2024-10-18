# Eisern Union

![Union](https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/1._FC_Union_Berlin_Logo.svg/1200px-1._FC_Union_Berlin_Logo.svg.png)


## Next Steps
- [X] Grab all blocks from `.venue.Venue.Blocks`
- [X] Book ticket at `.venue.BookTicket` with payload of
  ```js
  {
    "Count": 1,
    "BlockID": "bfd02969-45c1-4b1b-9157-b295f81d4f98", // BlockID
    "ResellingID": null,
    "ZD": "",
    "id": "85e4660b-4512-44c1-8e3e-49ce1ae3c698", // MatchID
    "SubName": "Veranstaltungen2"
  }
  ```
- [X] Identify which blocks can be booked
- [X] Call `BookTicket` with payload
-
