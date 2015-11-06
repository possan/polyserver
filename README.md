Poly Server
===========

A simple api that downloads an image from the interwebs and applies a delaunay triangulation on top of it, returning the list of triangles.


1. Install dependencies

    ```
    npm install
    ```


2. Start server

    ```
    node app.js
    ```


3. Issue a query

    ```
    curl -i -X POST -d url=https://i.scdn.co/image/93b353b8bb28ee2b9db2f4ebb661bb3280456c80 -d cutoff=5000 http://localhost:3000/convert
    ```

    that will return a json with your triangles in the format:

    ```
    {
        width: 200,
        height: 200,
        tris: [
            { x0: 0, y0: 0, x1: 100, y1: 0, x2: 100, y1: 100, r: 255, g: 0, b: 255 },
            ...
        ]
    }
    ```


4. Write a renderer for it.

