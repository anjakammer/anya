### comments for new pushes in a pull request
The comment is for providing the new preview URL
of the newly deployed application, after a new push to a pull request.

GitHub App Permissions:
* read Repository Contents
* read&write Pull Requests

GitHub Events:
* Pull Request (action: synchronize)

## Required Environment Variables

| Key             | Description                          |
| ----------------|--------------------------------------|
| `APP_NAME`      | Developer or App Name                |
| `WAIT_MS`       | Wait until sending the comment       |
| `COMMENT`       | Comment to send                      |
| `PAYLOAD`       | gh webhook pull request synchronize  |
| `TOKEN`         | jwt token to do api calls            |
