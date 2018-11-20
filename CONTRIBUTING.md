# Contributing to atom-over-and-back

Thanks for thinking about contributing to this project! Pull requests are
accepted, so feel free to submit them!

# Getting Started
To get started developing atom-over-and-back, follow these steps:

1. Download source code
```
git clone http://www.github.com/jwir3/atom-over-and-back
```

2. Navigate to the atom directory:
```
cd atom-over-and-back
```

3. Run atom from within the atom-over-and-back project directory:
```
atom .
```

4. Save the following to a file called `/tmp/aob.patch`:
```diff
diff --git a/lib/atom-over-and-back.js b/lib/atom-over-and-back.js
index d821ff0..245e223 100644
--- a/lib/atom-over-and-back.js
+++ b/lib/atom-over-and-back.js
@@ -18,6 +18,8 @@ export default {
   activate(state) {
     var self = this;

+    console.log("DEBUG: Atom over and back is started!");
+
     // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
     this.subscriptions = new CompositeDisposable();
```

5. Apply the patch:
```
patch -p0 < /tmp/aob.patch
```

6. Reload atom using <kbd>CMD</kbd>+<kbd>SHIFT</kbd>+<kbd>P</kbd> and typing `Window: Reload`.

7. Open the console with <kbd>CMD</kbd>+<kbd>OPTION</kbd>+<kbd>I</kbd> and verify the words "DEBUG: Atom over and back is started!" appear in the console.

# Development Workflow
If you're a regular contributor, feel free to assign tickets to yourself as you want. Otherwise, feel free to comment on a ticket stating that you intend to take it. This will prevent others from possibly working on the same ticket at the same time as you, wasting your effort.

Our general workflow is as follows:

1. Fork the `atom-over-and-back` repository to your own username.
2. Set up `origin` and `upstream` remotes on your local machine (this enables you to pull from the upstream repo while still using your personal version of the repo for branching):
```
git clone https://github.com/<your-username>/atom-over-and-back
cd atom-over-and-back
git remote add upstream https://www.github.com/jwir3/atom-over-and-back
```
3. Before beginning any work, verify that you have the latest version of `master` locally:
```
git pull upstream master
git push origin master
```
4. Create a branch
```
git checkout master
git checkout -b #XXX-some-cool-feature
```

5. Complete your masterpiece.
6. Push your branch to `origin`:
```
git push origin #XXX-some-cool-feature
```
7. Submit a pull request.
