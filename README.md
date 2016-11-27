# namm_example

The example application is a reddit clone, which basically has posts, comments, subreddits, subscriptions, upvotes/downvotes etc.  the framework is installed via npm into node_modules/namm (npm install namm --save)

server.js is the entry point, it simply requires the main framework file and chains all the requirements on it which sets up and initializes the application.  the directory structure is pretty simple; the main directories are: ./models (where mongo models are defined) ./public (where all the static html/css/images are) and ./routes (where custom backend code lives)

Models have custom attributes, for example the User $home property tells the application where to take the user on login/register based on role, and $init is the custom client-side code that bubbles up to the browser via the framework.
