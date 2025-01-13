---
layout: post
title: WebGL Renderer Preview
subtitle: A preview of the new WebGL renderer that improves rendering performance
tags:
- news
---


*Update by [Mike Kucera](https://github.com/mikekucera)*

Cytoscape.js is a Javascript library for interactive network visualization. Under the hood it uses the browser's [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API) to draw, or "render", networks to a canvas element in a web page. The Canvas API was a natural choice for Cytoscape.js because it supports a variety of visual styles, draws precise shapes and curves, and has full cross-browser compatibility. However, it does have one limitation that some projects are starting to encounter: performance. 

The performance in question is the "frame rate", or "frames per second" (FPS). Drawing the network to the canvas once counts as one frame. When the user interacts with the network many consecutive frames need to be drawn rapidly to create smooth animation.

The canvas renderer is written in Javascript, and so it is single-threaded. When drawing a frame it draws each node and edge one-at-a-time back-to-front according to their z-order. The more elements there are the longer it takes to draw them all. This creates a scalability issue where larger networks take longer to draw and show reduced FPS.

When the frame rate gets lower than about 15 FPS then the animation starts to look jerky. If it gets lower than 5 FPS then the network no longer feels responsive. If it gets lower than 1 FPS then it feels like the browser is freezing up and the user may start to wonder if the application is broken.

There is a need for a renderer that can draw "large" networks with a better frame rate. 

There has been a lot of impressive work done over the years to improve the performance of Cytoscape.js, but there is a limit to what can be done with single-threaded Javascript and the Canvas API. To get better performance we need a way to take better advantage of hardware graphics acceleration, we are exploring the use of a different rendering API... [WebGL](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API).

## Enter WebGL

Version 3.31 of Cytoscape.js contains a preview of a new WebGL renderer that uses the GPU to improve rendering performance. This is particularly noticeable for large networks.

WebGL enables Javascript applications to take advantage of the GPU using a standardized API. When some of the rendering work is moved to the GPU then that work is moved off the main Javascript thread. The GPU can typically draw many pixels in parallel leading to the potential for greatly improved performance. There are however some tradeoffs and limitations that will be discussed later in this post.

Here are some examples of preliminary tests run on an M1 MacBook pro using Chrome:

* An EnrichmentMap network (network of gene-set enrichment results) with approximately 1200 nodes and 16000 edges runs at about 20 FPS with the canvas renderer but speeds up to over 100 FPS with the WebGL renderer. 
* A publicly available network from NDExbio.org with approximately 3200 nodes and 68000 edges crawls at 3 FPS with the canvas renderer but improves to 10 FPS with the WebGL renderer. 10 FPS is still not really smooth animation, but it is a significant improvement over 3 FPS which is borderline unusable. 

This type of testing is subjective as it depends on the visual styles used, the size of the network, the browser, and the user’s hardware. In other words: YMMV. But so far the results are very promising.

In reality most applications that use Cytoscape.js probably don’t need the WebGL renderer. If your network is small or medium sized, and you don’t notice performance issues, then you can keep using the canvas renderer. But for some applications the WebGL renderer may be exactly what’s needed. 

## Limitations

The potential speedup from WebGL is exciting, however there are currently some limitations to what can be rendered.

The good news is that all [node](https://js.cytoscape.org/#style/node-body) and [label](https://js.cytoscape.org/#style/labels) styles are fully supported. Your nodes should look exactly the same with the WebGL renderer. Does this mean we reimplemented all those visual styles with WebGL? The answer is no. Cytoscape.js has been in active development for over a decade and has received numerous contributions from the open source community. Reimplementing every visual style with WebGL would be like starting from scratch. Instead the existing Canvas renderer is reused by the WebGL renderer. Nodes are rendered off-screen to a ["sprite sheet"](https://en.wikipedia.org/wiki/Texture_atlas) using the Canvas renderer and then used as textures by the WebGL renderer. This allows nodes to look the same while leveraging hardware acceleration. Each node only needs to be drawn to the sprite sheet once, then offloaded to video memory where it can be rendered repeatedly by the GPU. This approach also has the advantage that future contributions of new visual styles to the Canvas renderer should automatically work with the WebGL renderer as well.

Creating the sprite sheets does take some time when the network is first loaded. The preview release does not have a progress bar for this initial load time, so keep in mind that if your network doesn’t show up right away that just means it needs a few seconds to load.

The support for nodes is basically complete… edges however are a different story. First of all edges typically outnumber nodes by orders of magnitude (especially in large "hairball" networks), making them a major rendering bottleneck. Second edges are often very long compared to nodes. It would not be advantageous to use the same sprite-sheet strategy for edges that is used for nodes. The strategy for this first release is to render straight edges as long skinny rectangles, and bezier edges as a sequence of straight segments that approximate a curve.

* Only straight-line, haystack and bezier edges are supported. Other less frequently used edge types such as taxi or segmented edges will show up as bezier edges.
* Dashed lines, overlays and underlays are not supported.
* Edges can only have one label in the centre. Source and target labels are not supported yet.
* Only triangle shaped edge arrows are supported. Other arrow shapes will show up as triangles. Hollow arrows are not supported.
* Only solid colours are supported, no colour gradients. The source and target arrows and the edge line can have different colours though. Opacity is fully supported.

(Those who are familiar with WebGL know that everything is basically built from triangles. Straight edges are very fast to render with this approach because they consist of at most 4 triangles each, two for the long skinny rectangle that makes up the edge line, and possibly two more for the arrowheads.)

We feel these limitations are reasonable given the tradeoff in speed that is gained. Large and complex networks typically don’t benefit from using elaborate edge styles anyway. Those additional edge styles often get lost when numerous overlapping edges are viewed at a high zoom level.

In reality the WebGL renderer isn’t really a new renderer. It’s more like a new mode for the Canvas renderer. All of the code in the Canvas renderer that draws nodes and labels is reused, so is all of the boilerplate initialization code, code for detecting mouse movements and event handling, and more.

## Why WebGL, why not WebGPU?

There is a new browser graphics API in development called [WebGPU](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API) that is intended to become a web standard. We have decided not to use WebGPU because it doesn’t yet have cross-browser support, and it’s not yet available for mobile devices. It’s also not clear when full support will be available. Cytoscape.js has always made an effort to support older browsers and mobile devices. Therefore WebGL is the right choice at this time.

WebGPU may still have a use for accelerating applications that use Cytocape.js. One extremely useful feature of WebGPU (that isn’t available in WebGL) is that it can be used for compute workloads in addition to graphics. That means offloading expensive algorithms, like layout and graph algorithms, to the GPU. It’s possible to use both WebGL and WebGPU in the same page, so choosing WebGL for rendering does not preclude using WebGPU for other things. We welcome any future work to hardware-accelerate graph and layout algorithms using WebGPU, this would perfectly complement the WebGL renderer.

## How To Use the WebGL Renderer

We have set up a [demo site](https://cygpu.pages.dev/) where you can try the WebGL renderer on a handful of different networks.

You can also try the WebGL renderer in your own project. The WebGL renderer is brand new and is available as a preview release in version 3.31. Any options or API being introduced are provisional and may change. 

Here is an example that initializes cytoscape to use WebGL.

```js
cy = cytoscape({
  container: document.getElementById('cy'),
  elements: [ /* … */ ],
  style: [ /* … */ ],

  renderer: {
    name: 'canvas',  // still uses the canvas renderer
    webgl: true, // turns on WebGL mode
    showFps: true,  // (optional) shows the current FPS at the top-left 
    webglDebug: true, // (optional) prints debug info to the browser console

    // additional options (provisional, may change in future releases)
    webglTexSize: 4096,
    webglTexRows: 24, 
    webglBatchSize: 2048,
    webglTexPerBatch: 16,
});
```

There are some additional options that can be used to tune rendering performance, but they can be left to their defaults.

* `webglDebug`
    * If true prints verbose debugging info to the browser’s console.
* `webglTexSize`
    * This height/width of each texture (aka sprite sheet). Textures are always square. Affects buffering time and texture quality. Larger is higher quality but uses more memory. This value should be a power of 2, but doesn’t have to be.
* `webGlTexRows`
    * Number of rows to divide each texture into when using it as a sprite sheet. Affects number of textures created and texture quality.
* `webglBatchSize`
    * Nodes and edges are drawn in "batches". This value is the maximum number of nodes or edges to draw in each batch. The larger the max batch size the larger the WebGL data buffers are, but fewer batches are needed.
* `webglTexPerBatch`
    * Because of a technical limitation in WebGL there is a maximum number of textures that can be used per batch. The maximum is usually 16 for most browsers.

We welcome feedback and discussion of this new renderer. If you have any comments or bug reports please post them on our [GitHub Issue Tracker](https://github.com/cytoscape/cytoscape.js/issues).
