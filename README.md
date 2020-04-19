# firebase-api

Use firebase Auth to get a JWT from OAuth provider
Sent JWT as a Bearer Token to /api/v1/post, with the following valid actions

### GET /ready
The API simply responds if active

### POST /post/
Create a storage request to the API with the following requirements
- submittedBy: (string) The provider UID of the logged in user. Will be checked against the 'sub' in the JWT sent
- isComplete: (string) Form is complete = 'true'
- formName: (string) The name of the form you want to store data against for the given submitter
- formData: (string) The JSON stringified form data

### GET /post/:formName
Retrieve the last incomplete form of 'formName' submitted by the 'sub' (uid) of the JWT sent to the API
returns JSON object of form fields previously submitted, and the sumbission ID

### PUT /post/:id
Update a previous submission as specified by the submission ID retrieved with a GET request. Requires the following
- submittedBy: (string) The provider UID of the logged in user. Will be checked against the 'sub' in the JWT sent
- isComplete: (string) Form is complete = 'true'
- formName: (string) The name of the form you want to store data against for the given submitter
- formData: (string) The JSON stringified form data

### DELETE /post/:id
Destroy a previous submission as specified by the submission ID retrieved with a GET request. Must match the 'sub' in the JWT

