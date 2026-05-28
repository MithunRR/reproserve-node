

//   Base URL: http://localhost:3000/api

//   — Register a realtor/service provider

//   ┌───────────┬─────────────────────────────────────────┐
//   │   Field   │                  Value                  │
//   ├───────────┼─────────────────────────────────────────┤
//   │ Method    │ POST                                    │
//   ├───────────┼─────────────────────────────────────────┤
//   │ URL       │ http://localhost:3000/api/auth/register │
//   ├───────────┼─────────────────────────────────────────┤
//   │ Headers   │ Content-Type: application/json          │
//   ├───────────┼─────────────────────────────────────────┤
//   │ Body type │ raw → JSON                              │
//   └───────────┴─────────────────────────────────────────┘

//   Sample body:
  {
    "role": "realtor", // service_provider
    "firstName": "Alice",
    "lastName": "Carter",
    "email": "alice.carter@bestrealty.com",
    "phone": "8555555555",
    "password": "secret123",
    "confirmPassword": "secret123",
    "streetAddress": "120 Main St, Suite 4",
    "city": "Austin",
    "state": "TX",
    "zipCode": "78701",
    "businessName": "A. B. C",
    "serviceType": "", // Dropdown
    "businessDesc": "asdf asdf asdf asdf asdf asdf asdf asdf asdf"
  }


//  — Login as that realtor

//   ┌───────────┬──────────────────────────────────────┐
//   │   Field   │                Value                 │
//   ├───────────┼──────────────────────────────────────┤
//   │ Method    │ POST                                 │
//   ├───────────┼──────────────────────────────────────┤
//   │ URL       │ http://localhost:3000/api/auth/login │
//   ├───────────┼──────────────────────────────────────┤
//   │ Headers   │ Content-Type: application/json       │
//   ├───────────┼──────────────────────────────────────┤
//   │ Body type │ raw → JSON                           │
//   └───────────┴──────────────────────────────────────┘

//   Sample body
  {
    "email": "alice.carter@bestrealty.com",
    "password": "secret123"
  }


//   — Register a user
//   Sample body:
  {
    "role": "user",
    "firstName": "Alice",
    "lastName": "Carter",
    "email": "alice.carter@bestrealty.com",
    "phone": "8555555555",
    "password": "secret123",
    "confirmPassword": "secret123",
    "streetAddress": "120 Main St, Suite 4",
    "city": "Austin",
    "state": "TX",
    "zipCode": "78701"
  }


// ============================================================
//   SERVICE TYPES  (CRUD)
//   Controller: serviceType.controller.js
//   Base URL  : http://localhost:3000/api/service-types
// ============================================================


//   — Create a service type

//   ┌───────────┬─────────────────────────────────────────────┐
//   │   Field   │                    Value                    │
//   ├───────────┼─────────────────────────────────────────────┤
//   │ Method    │ POST                                        │
//   ├───────────┼─────────────────────────────────────────────┤
//   │ URL       │ http://localhost:3000/api/service-types     │
//   ├───────────┼─────────────────────────────────────────────┤
//   │ Headers   │ Content-Type: application/json              │
//   ├───────────┼─────────────────────────────────────────────┤
//   │ Body type │ raw → JSON                                  │
//   └───────────┴─────────────────────────────────────────────┘

//   Sample body:
  {
    "name": "Plumbing",
    "description": "Plumbing repair and installation services",
    "isActive": true
  }

//   Success response: 201 Created
  {
    "success": true,
    "message": "Service type created",
    "data": {
      "id": 1,
      "name": "Plumbing",
      "description": "Plumbing repair and installation services",
      "isActive": true,
      "createdAt": "2026-05-16T10:00:00.000Z",
      "updatedAt": "2026-05-16T10:00:00.000Z"
    }
  }


//   — List all service types

//   ┌───────────┬─────────────────────────────────────────────┐
//   │   Field   │                    Value                    │
//   ├───────────┼─────────────────────────────────────────────┤
//   │ Method    │ GET                                         │
//   ├───────────┼─────────────────────────────────────────────┤
//   │ URL       │ http://localhost:3000/api/service-types     │
//   └───────────┴─────────────────────────────────────────────┘

//   Success response: 200 OK
  {
    "success": true,
    "count": 2,
    "data": [
      { "id": 1, "name": "Electrical", "description": "...", "isActive": true },
      { "id": 2, "name": "Plumbing",   "description": "...", "isActive": true }
    ]
  }


//   — Get one service type by id

//   ┌───────────┬─────────────────────────────────────────────┐
//   │   Field   │                    Value                    │
//   ├───────────┼─────────────────────────────────────────────┤
//   │ Method    │ GET                                         │
//   ├───────────┼─────────────────────────────────────────────┤
//   │ URL       │ http://localhost:3000/api/service-types/:id │
//   └───────────┴─────────────────────────────────────────────┘

//   Example: GET http://localhost:3000/api/service-types/1

//   Success response: 200 OK
  {
    "success": true,
    "data": {
      "id": 1,
      "name": "Plumbing",
      "description": "Plumbing repair and installation services",
      "isActive": true
    }
  }


//   — Update a service type

//   ┌───────────┬─────────────────────────────────────────────┐
//   │   Field   │                    Value                    │
//   ├───────────┼─────────────────────────────────────────────┤
//   │ Method    │ PUT                                         │
//   ├───────────┼─────────────────────────────────────────────┤
//   │ URL       │ http://localhost:3000/api/service-types/:id │
//   ├───────────┼─────────────────────────────────────────────┤
//   │ Headers   │ Content-Type: application/json              │
//   ├───────────┼─────────────────────────────────────────────┤
//   │ Body type │ raw → JSON                                  │
//   └───────────┴─────────────────────────────────────────────┘

//   Example: PUT http://localhost:3000/api/service-types/1
//   Sample body (any field is optional — send only what you want to change):
  {
    "name": "Plumbing & Pipes",
    "description": "Updated description",
    "isActive": false
  }

//   Success response: 200 OK
  {
    "success": true,
    "message": "Service type updated",
    "data": { "id": 1, "name": "Plumbing & Pipes", "isActive": false }
  }


//   — Delete a service type

//   ┌───────────┬─────────────────────────────────────────────┐
//   │   Field   │                    Value                    │
//   ├───────────┼─────────────────────────────────────────────┤
//   │ Method    │ DELETE                                      │
//   ├───────────┼─────────────────────────────────────────────┤
//   │ URL       │ http://localhost:3000/api/service-types/:id │
//   └───────────┴─────────────────────────────────────────────┘

//   Example: DELETE http://localhost:3000/api/service-types/1

//   Success response: 200 OK
  {
    "success": true,
    "message": "Service type deleted"
  }


  // ============================================================
//   SERVICE TYPES  (CRUD)
//   Controller: profile.controller.js
//   Base URL  : http://localhost:3000/api/profile
// ============================================================

  //   — Get one service type by id

//   ┌───────────┬─────────────────────────────────────────────┐
//   │   Field   │                    Value                    │
//   ├───────────┼─────────────────────────────────────────────┤
//   │ Method    │ GET                                         │
//   ├───────────┼─────────────────────────────────────────────┤
//   │ URL       │ http://localhost:3000/api/profile/:id       │
//   └───────────┴─────────────────────────────────────────────┘

//   Example: GET http://localhost:3000/api/profile/1

//   Success response: 200 OK
  {
    "success": true,
    "data": {
        "id": 1,
        "role": "service_provider",
        "firstName": "Alice",
        "lastName": "Carter",
        "email": "alice.carter@bestrealty.com",
        "phone": "8555555555",
        "password": "$2a$10$QJB8igqhbNXqnawMs2508eh3kPj117NDwho49p9UuK2X/rNM055S.",
        "streetAddress": "120 Main St, Suite 4",
        "city": "Austin",
        "state": "TX",
        "zipCode": "78701",
        "businessName": "A. B. C",
        "serviceTypeId": null,
        "businessDesc": "asdf asdf asdf asdf asdf asdf asdf asdf asdf",
        "isActive": true,
        "createdAt": "2026-05-16T06:09:36.000Z",
        "updatedAt": "2026-05-16T06:09:36.000Z"
    }
}

//   — Update a profile

//   ┌───────────┬─────────────────────────────────────────────┐
//   │   Field   │                    Value                    │
//   ├───────────┼─────────────────────────────────────────────┤
//   │ Method    │ PUT                                         │
//   ├───────────┼─────────────────────────────────────────────┤
//   │ URL       │ http://localhost:3000/api/profile/:id       │
//   ├───────────┼─────────────────────────────────────────────┤
//   │ Headers   │ Content-Type: application/json              │
//   ├───────────┼─────────────────────────────────────────────┤
//   │ Body type │ raw → JSON                                  │
//   └───────────┴─────────────────────────────────────────────┘

//   Example: PUT http://localhost:3000/api/profile/1
//   Sample body (any field is optional — send only what you want to change):
  {
        "id": 1,
        "firstName": "Peter",
        "lastName": "Parker",
        "email": "peter.parker@bestrealty.com",
        "phone": "8555555555",
        "streetAddress": "120 Main St, Suite 4",
        "city": "Austin",
        "state": "TX",
        "zipCode": "78701",
        "businessDesc": "asdf asdf asdf asdf asdf asdf asdf asdf asdf"
    }

//   Success response: 200 OK
  {
      "success": true,
      "message": "User updated successfully",
      "data": {
          "id": 1,
          "role": "service_provider",
          "firstName": "Peter",
          "lastName": "Parker",
          "email": "peter.parker@bestrealty.com",
          "phone": "8555555555",
          "password": "$2a$10$QJB8igqhbNXqnawMs2508eh3kPj117NDwho49p9UuK2X/rNM055S.",
          "streetAddress": "120 Main St, Suite 4",
          "city": "Austin",
          "state": "TX",
          "zipCode": "78701",
          "businessName": "A. B. C",
          "serviceTypeId": null,
          "businessDesc": "asdf asdf asdf asdf asdf asdf asdf asdf asdf",
          "isActive": true,
          "createdAt": "2026-05-16T06:09:36.000Z",
          "updatedAt": "2026-05-18T15:01:18.870Z"
      }
  }


//   — Common error responses

//   400  { "success": false, "message": "name is required" }
//   401  { "success": false, "message": "Unauthorized — invalid or expired token" }
//   403  { "success": false, "message": "No token provided" }
//   404  { "success": false, "message": "Service type not found" }
//   409  { "success": false, "message": "Service type with this name already exists" }


// ============================================================
//   OPEN HOUSES  (CRUD with photo / video upload)
//   Controller : openHouse.controller.js
//   Base URL   : http://localhost:3000/api/open-houses
//   Uploads    : multipart/form-data
//                ─ field "photos"  → up to 10 image files
//                ─ field "video"   → 1 video file
//   Stored in  : assets/photos/ and assets/videos/
//   DB columns : photos = JSON array of public paths
//                video  = single public path string
//   Static URL : files are served at  http://localhost:3000/assets/...
// ============================================================


//   — Create an open house

//   ┌───────────┬─────────────────────────────────────────────┐
//   │   Field   │                    Value                    │
//   ├───────────┼─────────────────────────────────────────────┤
//   │ Method    │ POST                                        │
//   ├───────────┼─────────────────────────────────────────────┤
//   │ URL       │ http://localhost:3000/api/open-houses       │
//   ├───────────┼─────────────────────────────────────────────┤
//   │ Headers   │ Content-Type: multipart/form-data           │
//   ├───────────┼─────────────────────────────────────────────┤
//   │ Body type │ form-data (NOT raw JSON)                    │
//   └───────────┴─────────────────────────────────────────────┘

//   Form-data fields (in Postman → Body → form-data):
//   ─────────────────────────────────────────────────────────────────
//   Key                  Type     Value
//   ─────────────────────────────────────────────────────────────────
//   userId               Text     1
//   role                 Text     realtor                (optional)
//   propertyType         Text     Apartment
//   title                Text     Modern 2BHK in Austin
//   description          Text     Spacious home with balcony and parking
//   location             Text     120 Main St, Austin, TX 78701
//   price                Text     450000
//   squareFootage        Text     1200                    (optional)
//   fromDateAndTime      Text     2026-05-25T10:00:00Z
//   toDateAndTime        Text     2026-05-25T13:00:00Z    (optional)
//   specs                Text     {"bedrooms":2,"bathrooms":2,"parking":1}   (JSON string, optional)
//   photos               File     pick image file(s) — can add the key multiple times
//   video                File     pick a single video file (optional)
//   ─────────────────────────────────────────────────────────────────

//   Success response: 201 Created
  {
    "success": true,
    "message": "Open house created",
    "data": {
      "id": 1,
      "userId": 1,
      "role": "realtor",
      "propertyType": "Apartment",
      "title": "Modern 2BHK in Austin",
      "description": "Spacious home with balcony and parking",
      "specs": { "bedrooms": 2, "bathrooms": 2, "parking": 1 },
      "location": "120 Main St, Austin, TX 78701",
      "price": "450000.00",
      "squareFootage": 1200,
      "fromDateAndTime": "2026-05-25T10:00:00.000Z",
      "toDateAndTime":   "2026-05-25T13:00:00.000Z",
      "photos": [
        "/assets/photos/1716100000000-123456789.jpg",
        "/assets/photos/1716100000001-987654321.jpg"
      ],
      "video": "/assets/videos/1716100000002-555555555.mp4",
      "isActive": true,
      "createdAt": "2026-05-19T10:00:00.000Z",
      "updatedAt": "2026-05-19T10:00:00.000Z"
    }
  }

//   Access stored files:
//     GET http://localhost:3000/assets/photos/1716100000000-123456789.jpg
//     GET http://localhost:3000/assets/videos/1716100000002-555555555.mp4


//   — List all open houses

//   ┌───────────┬─────────────────────────────────────────────┐
//   │   Field   │                    Value                    │
//   ├───────────┼─────────────────────────────────────────────┤
//   │ Method    │ GET                                         │
//   ├───────────┼─────────────────────────────────────────────┤
//   │ URL       │ http://localhost:3000/api/open-houses       │
//   └───────────┴─────────────────────────────────────────────┘

//   Success response: 200 OK — returns each record with its `user` (id, firstName, lastName, email, role)


//   — Get one open house by id

//   ┌───────────┬─────────────────────────────────────────────┐
//   │   Field   │                    Value                    │
//   ├───────────┼─────────────────────────────────────────────┤
//   │ Method    │ GET                                         │
//   ├───────────┼─────────────────────────────────────────────┤
//   │ URL       │ http://localhost:3000/api/open-houses/:id   │
//   └───────────┴─────────────────────────────────────────────┘

//   Example: GET http://localhost:3000/api/open-houses/1


//   — Update an open house

//   ┌───────────┬─────────────────────────────────────────────┐
//   │   Field   │                    Value                    │
//   ├───────────┼─────────────────────────────────────────────┤
//   │ Method    │ PUT                                         │
//   ├───────────┼─────────────────────────────────────────────┤
//   │ URL       │ http://localhost:3000/api/open-houses/:id   │
//   ├───────────┼─────────────────────────────────────────────┤
//   │ Headers   │ Content-Type: multipart/form-data           │
//   ├───────────┼─────────────────────────────────────────────┤
//   │ Body type │ form-data                                   │
//   └───────────┴─────────────────────────────────────────────┘

//   Notes:
//   ─ Send only the fields you want to change.
//   ─ If you upload new `photos`, by default they are APPENDED to the existing array.
//     Pass form-data field  replacePhotos=true  to wipe old photos (and delete the files
//     from disk) and use the new ones only.
//   ─ Uploading a new `video` replaces the existing one (and deletes the old file from disk).

//   Example form-data:
//   ─────────────────────────────────────────────────────────────────
//   title          Text     New title
//   price          Text     475000
//   replacePhotos  Text     true
//   photos         File     pick image file(s)
//   video          File     pick a new video (optional)
//   ─────────────────────────────────────────────────────────────────

//   Success response: 200 OK
  {
    "success": true,
    "message": "Open house updated",
    "data": { /* updated record */ }
  }


//   — Delete an open house

//   ┌───────────┬─────────────────────────────────────────────┐
//   │   Field   │                    Value                    │
//   ├───────────┼─────────────────────────────────────────────┤
//   │ Method    │ DELETE                                      │
//   ├───────────┼─────────────────────────────────────────────┤
//   │ URL       │ http://localhost:3000/api/open-houses/:id   │
//   └───────────┴─────────────────────────────────────────────┘

//   Also removes the associated photo/video files from the assets folder.

//   Success response: 200 OK
  {
    "success": true,
    "message": "Open house deleted"
  }


//   — Common error responses (open houses)

//   400  { "success": false, "message": "userId, propertyType, title, description, location, price and fromDateAndTime are required" }
//   400  { "success": false, "message": "Invalid userId — user not found" }
//   400  { "success": false, "message": "Only image and video files are allowed" }
//   400  { "success": false, "message": "File too large" }
//   404  { "success": false, "message": "Open house not found" }
