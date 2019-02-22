# Manual Deployment Deletion
A preview deployment can always be deleted with the push of a button. This button says `Delete Deployment` and is shown for the `3-Deploy` stage when a deployment succeeded.

> ![](../img/delete-deployment-button.png)

When the deletion finished, a pull request comment is made in the 'Conversation' tab that shows the deletion for the corresponding commit.
> ![](../img/delete-deployment-comment.png)

The deployment could be rerun with the optional [manual deployment trigger](manual-deployment.md). However, this would not change anything since the deployment is always made from the underlying commit.
