---
layout: post
title: Contributing to Cytoscape.js
subtitle: How to make your first contribution to Cytoscape.js
tags:
- tutorial
---

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [Why Contribute?](#why-contribute)
- [Introduction](#introduction)
- [Discussing Contributions](#discussing-contributions)
- [Contributing](#contributing)
  - [Forking and cloning](#forking-and-cloning)
  - [Making a new branch](#making-a-new-branch)
  - [Writing code](#writing-code)
    - [Style](#style)
    - [Committing](#committing)
    - [Code Organization](#code-organization)
    - [Building and Testing Cytoscape.js](#building-and-testing-cytoscapejs)
  - [Pushing changes](#pushing-changes)
  - [Creating a pull request and receiving feedback](#creating-a-pull-request-and-receiving-feedback)
- [Conclusion](#conclusion)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->


## Why Contribute?

- Cytoscape.js has a highly permissive [MIT License](https://github.com/cytoscape/cytoscape.js/blob/master/LICENSE), which allows users to modify the software as they see fit. Contributing changes back to Cytoscape.js makes the software better for everyone!
- You'll join a community of several dozen other contributors who have helped to test, fix, and improve the nearly twenty-thousand lines of code that make up the core of Cytoscape.js and the thousands more that make up Cytoscape.js's [30 (and counting) extensions](http://js.cytoscape.org/#extensions).
- Contributing means that your changes will be maintained as part of the project, making upgrading to newer versions of Cytoscape.js a lot easier—no more having to re-add your changes and rebuild the code for each release.
  - Releases frequently bring performance improvements; having your changes in Cytoscape.js means that your feature will automatically benefit from these performance enhancements.
- Having your contributions in the main build of Cytoscape.js means you can take advantage of the various CDNs hosting builds of Cytoscape.js and save on bandwidth.
- Submitting contributions means that your code can be improved through code reviews and use by others.
- You gain experience coding for a professionally designed open source project, gaining valuable feedback on your coding and adding to your portfolio.
- [Cytoscape.js is widely used in medical research, among other fields](http://js.cytoscape.org/#introduction/factsheet), meaning that your contributions can help make a positive difference in the world.
- Each contribution improves Cytoscape.js, attracting additional users, which brings additional contributions, and so on. Contributing improvements to Cytoscape.js ensures that it remains the popular (over 3000 stars on GitHub!) and highly-maintained project it is today—and an active and engaged community of users and developers helps ensure the continued funding of Cytoscape.js!

## Introduction

[Cytoscape.js](https://js.cytoscape.org) is an open-source project and welcomes any and all contributions—everything from a small documentation fix to a significant new feature is appreciated.
It was created at the [Donnelly Center](http://thedonnellycentre.utoronto.ca/) at the University of Toronto and is under active development, coordinated through [GitHub](https://github.com/cytoscape/cytoscape.js).
The first commit to Cytoscape.js occurred in August 2011; since then, 49 different contributors have made more than 6 million changes to the code in over 3500 separate commits, have led the development of eight community-maintained extensions, and have helped to improve the 22 first-party extensions currently available.
Intellection property rights are held by the [Cytoscape Consortium](http://www.cytoscapeconsortium.org/), a 501(c)(3) not-for-profit which promotes the use of Cytoscape.js (and other software) in bioinformatics to further the study of biological networks. [Funding] is provided through grants from the U.S. National Institutes of Health.

This guide is aimed primarily towards users without prior experience contributing to open-source software (OSS).
For contributors familiar with the process, the [`CONTRIBUTING.md`](https://github.com/cytoscape/cytoscape.js/blob/master/CONTRIBUTING.md) file is a good place to read about Cytoscape.js-specific guidelines, such as code style.

Before you get started with this guide, make sure [Node.js](https://nodejs.org/en/) is installed.
To test this, open a terminal and run `node --version` and `npm --version` and ensure that both commands run successfully.
To ensure compatibility with the various build tools that Cytoscape.js uses (introduced in [Forking and cloning](#forking-and-cloning)), a recent version of Node.js is recommended (either the current branch or LTS branch).

  > For developers on MacOS and Linux, tools such as [nvm](https://github.com/creationix/nvm) can be used instead of installing Node.js system-wide.
  > `nvm` installs Node.js to your home directory, instead of system-wide, allowing for side-by-side installations of Node.js versions and easily switching the active Node.js installation.

Additionally, downloading the code and submitting changes requires [Git](https://git-scm.com/downloads) to be installed.
For contributors unfamiliar with Git, the [GitHub Desktop](https://desktop.github.com/) is recommended.

## Discussing Contributions

Discussion for Cytoscape.js happens in several places:
- [Stack Overflow](http://stackoverflow.com/questions/tagged/cytoscape.js): for help and troubleshooting code which uses Cytoscape.js
- [Gitter](https://gitter.im/cytoscape/cytoscape.js): chatroom for Cytoscape.js; good for help and troubleshooting code using Cytoscape.js
- [GitHub Issues](https://github.com/cytoscape/cytoscape.js/issues): for bug reports and feature requests
- [GitHub Pull Requests](https://github.com/cytoscape/cytoscape.js/pulls): for discussing code contributions before they are merged into Cytoscape.js

For code contributions, most discussion will occur on the pull request (PR) for that contribution.
We ask that discussions 1) are kept civil and 2) are kept helpful.

## Contributing

Contributing can be broken down into a series of steps:
1. Fork the project
2. Clone your fork
3. Make a new branch
4. Make changes
5. Commit and push changes
6. Create a pull request
7. Keep track of requested changes, etc.

### Forking and cloning

Steps 1-2 (forking and cloning) [are covered in depth by GitHub](https://guides.github.com/activities/forking/).

In short, [create a GitHub profile](https://github.com/join) if you do not have one, [visit the GitHub page for Cytoscape.js](https://github.com/cytoscape/cytoscape.js), click the Fork button, and clone your fork to download the code to your computer (using either the GitHub Desktop client or the command line).

1. To fork Cytoscape.js, [click the "Fork" button on the Cytoscape.js GitHub page](https://github.com/cytoscape/cytoscape.js).

![Fork button]({{ site.url }}/public/images/contributing/fork.png)


2. For cloning from the command line, first open a terminal and `cd` to whichever directory you want to clone Cytoscape.js into.
Then, run `git clone https://github.com/cytoscape/cytoscape.js.git` to download the code into a directory called `cytoscape.js`.
To clone using the GitHub desktop app, [clicking this link](github-windows://openRepo/https://github.com/cytoscape/cytoscape.js) will open the desktop app and start the cloning process.
3. After you have cloned the reposity to your computer, open a terminal and `cd` into the Cytoscape.js directory, i.e. `cd cytoscape.js`.
Once in the directory, run `npm install` to (locally) install all dependencies that Cytoscape.js requires for development.

### Making a new branch

Once you have a copy of the code on your computer, you can create a new branch and start to work on your contribution(s).

> Branching is an important part of the Git workflow.
> In the case of Cytoscape.js, it allows development to proceed simultaneously on several branches such as `master` (which is the branch which official releases are based on), `unstable` (where new features are added), and various long-term development branches.

Cytoscape.js development happens on the `unstable` branch, so make sure you have this branch checked out before you create a new branch.
To checkout the `unstable` branch, navigate to whichever directory you cloned Cytoscape.js to and run `git checkout unstable`.
Then, create your new branch (which will be based on the `unstable` branch) with `git checkout -b feature/awesomeThing` where `feature/awesomeThing` is a descriptive name for your contribution to Cytoscape.
`git checkout -b` will both create a new branch and checkout the new branch, so all changes to code following this command will affect your newly created branch while leaving other branches untouched.

*Note: for bugfixes to the currently-released version of Cytoscape.js, use the `master` branch instead of the `unstable` branch for this step and the remainder of this guide.*

If you are working with the GitHub Desktop client, follow [the GitHub guide](https://help.github.com/desktop/guides/contributing/creating-a-branch-for-your-work/), selecting the `unstable` branch to base your fork on when prompted.

If you are contributing multiple new features to Cytoscape.js (or fixing multiple issues), create separate branches for each feature/ bugfix to make reviewing and merging changes easier.
Running `git checkout unstable` will restore the `unstable` branch where you can run `git checkout -b feature/anotherThing` to start a second branch and then run `git checkout feature/awesomeThing` and `git checkout feature/anotherThing` to switch between branches.

### Writing code

Once you've started a new branch, you can start to write code!
Although it's outside the scope of this guide; I'd recommend working in an editor such as [Visual Studio Code](https://code.visualstudio.com/), [Atom](https://atom.io/), or [Sublime Text](https://www.sublimetext.com/).
Development of Cytoscape.js requires several additional packages which are defined in `package.json` including Gulp (build/ test/ formatting/ etc. automation), ESLint (formatting), and Mocha and Chai (tests and assertions), among others.
Install these by navigating to the folder containing Cytoscape.js and running `npm install`.
Cytoscape.js comes with a `.eslint.json` file which ESLint will use when inspecting your code, helping to reduce bugs and maintain a uniform style.

Starting with version 3.2.0, Cytoscape.js uses [Babel](https://babeljs.io/) for transpiling, so you can take advantage of ES2015/ES6 features.

#### Style

On the topic of uniform style: the Cytoscape.js doesn't have a strict style guide.
The only rules are to use two spaces for indentation and use single-quotes around strings; other than this, just try to match the style of existing code.

#### Committing

As you write code, commit changes with `git add .` and `git commit -m "work on awesome feature"`.
If using GitHub Desktop, [review the guide from GitHub](https://help.github.com/desktop/guides/contributing/committing-and-reviewing-changes-to-your-project/) about committing changes.

> Frequency of commits is a personal preference; however, I recommend committing after completing each "unit of work" where each unit is a block of changes to one or more files that do not break compilation of Cytoscape.js.

#### Code Organization

Important folders for development are described here:

- `src/`: The `src/` folder is likely where you'll spend most of your time; this folder contains the many files that are combined at build-time to create the `cytoscape.js` file that is used in applications.
- `test/`: The `test/` folder contains tests for Cytoscape.js. If you are contributing a feature that can be tested, please add tests for this feature. If you are contributing a bugfix, add a test that fails without your bugfix.
- `documentation/`: The `documentation/` folder contains documentation for all public features of Cytoscape.js (internal/ private APIs need not be documented here). For new features, please add documentation on how to use them here.
  - Documentation is based on the `docmaker.json` file, which references various Markdown files in `documentation/md`. When documentation is built, the Markdown files are combined with the JSON file to create the output HTML documentation.
- `dist/`: The `dist/` folder contains the most recent publicly-released version of Cytoscape.js. This is the version that is published to npm and [js.cytoscape.org/](http://js.cytoscape.org/) on each new release.
- `build/`: Building Cytoscape.js will compile the many files within `src/` and emit three files here:
  - `cytoscape.js`, containing a non-minified build of Cytoscape.js
  - `cytoscape.min.js`, containing a minified build.
  - `cytoscape.cjs.js`, containing a non-minified build of Cytoscape.js without dependencies included (for Cytoscape.js >= 3.2.0)

> Note: Although it is useful (and recommended) to build your own distribution(s) of Cytoscape.js while testing your code, you should not include these builds in the `dist/` folder when pushing to GitHub or creating a pull request. When the next version of Cytoscape.js is ready for distribution, a new "official" version will be built and moved into `dist/`.

#### Building and Testing Cytoscape.js

To build and test new features or bugfixes, run `npm run build` (to build Cytoscape.js without testing) or `npm run test` (to run all tests).
If these commands fail, make sure you followed the instructions in [Forking and cloning](#forking-and-cloning) to install dependencies.

### Pushing changes

Once you've tested and committed your changes, push your branch to GitHub with `git push -u origin newFeature`.
The `-u origin newFeature` part is necessary here since the branch does not yet exist on GitHub.
Replace `newFeature` with the name of the branch you have been working on locally.
After this initial push, later pushes (such as making additional edits to code) can be sent to GitHub with `git push` (without any additional flags).

If using the GitHub desktop client, [review their guide](https://help.github.com/desktop/guides/contributing/committing-and-reviewing-changes-to-your-project/) for pushing/ syncing changes.

### Creating a pull request and receiving feedback

Now that you've pushed your changes to GitHub, it's time to leave the command-line/ desktop GitHub client and open your browser to create a pull request. 

> Pull requests are used to request that a project maintainer merge your changes into the target project.
> In this case, the pull request is a request to merge your feature branch into Cytoscape.js's `unstable` branch.

Navigate to [Cytoscape.js's `unstable` branch on GitHub](https://github.com/cytoscape/cytoscape.js/tree/unstable) and follow the [Creating a pull request from a fork](https://help.github.com/articles/creating-a-pull-request-from-a-fork/) guide on GitHub.
Basing your feature/ bugfix branch off of the `unstable` fork of Cytoscape.js should help ensure that the pull request doesn't have any conflicts and can be merged automatically after the pull request is approved.

To submit the pull request, open the Pull Request page, choose *Compare Across Forks*, and select `cytoscape/cytoscape.js` as the base fork and `unstable` as the base, with your feature branch of your fork as the head fork.
Once you've selected the base and head branches, write a PR message describing your changes and click the *Create pull request* button.

Once you've made the PR, you'll likely receive some feedback and requests for changes.
To make any changes to your PR, follow the [Committing](#committing) and [Pushing changes](#pushing-changes) steps again.
As you push your changes to GitHub, they'll automatically be reflected in the PR.

## Conclusion

After you've made any requested changes, your contribution should be merged. Congratulations!
Now, new builds of Cytoscape.js will include your feature/ bugfix and your work will be maintained between releases.

If you have any questions about the process, feel free to reach out on [Gitter](https://gitter.im/cytoscape/cytoscape.js).
For help with the pull request process, consult the [GitHub guides](https://help.github.com/articles/about-pull-requests/) and [Atlassian's guide](https://www.atlassian.com/git) for guidance on additional topics, such as fixing merge conflicts and managing multiple branches.