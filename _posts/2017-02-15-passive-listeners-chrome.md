---
layout: post
title: Chrome breaks listener APIs, Cytoscape.js apps affected
subtitle: Upgrade to Cytoscape.js 2.7.15 or use one of the included workarounds
tags:
- news
---

Chrome has made breaking API changes to  [`EventTarget.addEventListener()`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener), starting with version 56.

The issue is regarding the new `options` object that `addEventListener()` can take in place of the `useCapture` boolean, [specified in the W3C living spec](https://dom.spec.whatwg.org/#dom-eventtarget-addeventlistener).  The `options` object is meant to allow for more refined listener behaviour, like automatically removing the listener for `once: true`.

The issue is with the `passive` field in `options`, which indicates whether the listener's callback calls [`event.preventDefault()`](https://developer.mozilla.org/en-US/docs/Web/API/Event/preventDefault).  Chrome now assumes that, unless explicitly specified otherwise, [`passive` is always `true` for touch](https://github.com/WICG/interventions/issues/18).  This breaks all existing code that requires the use of `event.preventDefault()`.

The net effect of this breaking API change in Chrome is that it [breaks gesture support in Cytoscape.js](https://github.com/cytoscape/cytoscape.js/issues/1702).  It is not possible to support gestures in Cytoscape.js, like pinch-to-zoom, without preventing the default browser gestures that would occur during the same sequence of user events.

There is a workaround for this issue in version 2.7.15 of Cytoscape.js.  Even if your apps or sites are not targeted towards touch devices, it is recommended to upgrade Cytoscape.js to get the workaround.  Google is taking a strong stance on breaking compatibility of the existing code on the web, and it seems likely that Google may make similar changes to Chrome on desktop in future (e.g. the `wheel` event).  The workaround in Cytoscape.js is sufficiently robust to avoid problems Google would cause if passive events were also forced on desktop versions of Chrome.

If you are unable to update Cytoscape.js, it is possible to use a CSS workaround.  Set `touch-action: none` on each `container` that holds an instance of Cytoscape.js.  A caveat with this approach is that it is all-or-nothing:  Default browser gestures, such as scrolling the page, will never work on elements for which `touch-action: none` is set.

This means that `touch-action: none` is not sufficient if your app needs to selectively toggle whether panning and zooming are enabled on Cytoscape.js.  In browsers with standard behaviour, Cytoscape.js can automatically allow browser gestures to behave normally when they would not conflict with Cytoscape.js gestures.  For instance, those standardly behaving browsers allow you to drag over the Cytoscape.js container when zooming and panning are disabled in Cytoscape.js to scroll the page.  The `touch-action` property does not allow for nuanced behaviour like that.

An alternative workaround is to use the [Normify](https://github.com/maxkfranz/normify) library.  It patches the `addEventListener` API globally such that the standard behaviour of the function is enforced.  This does mean a small, one-line update to your apps.  However, it allows you to continue to use the version of Cytoscape.js that you already have in your apps, and it makes Chrome behave properly for all usecases of Cytoscape.js.  Using this library is the least invasive change possible, especially for legacy apps, and it should insure that any other libraries that Chrome has broken will also work in your apps.

[We have tried to advocate](https://bugs.chromium.org/p/chromium/issues/detail?id=639227) on behalf of Cytoscape.js users to have Chrome developers reverse their breaking API changes, but they have not changed their stance.  We have tried to provide workarounds as best we can, and we hope that they suffice for your apps. Thank you for your understanding.

*You can comment on this on [Chromium issue 639227](https://bugs.chromium.org/p/chromium/issues/detail?id=639227) or on [WICG/interventions#18](https://github.com/WICG/interventions/issues/18) on GitHub.*
