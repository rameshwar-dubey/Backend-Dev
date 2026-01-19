const http = require('http');
const url = require('url');

let tasks = [];
let id = 1;

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);

    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'GET' && parsedUrl.pathname === '/tasks') {
        res.end(JSON.stringify(tasks));
    }

    else if (req.method === 'POST' && parsedUrl.pathname === '/tasks') {
        let body = '';

        req.on('data', chunk => {
            body += chunk;
        });

        req.on('end', () => {
            const task = JSON.parse(body);
            task.id = id++;
            tasks.push(task);

            res.end(JSON.stringify({ message: "Task added", task }));
        });
    }

    else if (req.method === 'PUT' && parsedUrl.pathname.startsWith('/tasks/')) {
        const taskId = parseInt(parsedUrl.pathname.split('/')[2]);

        let body = '';

        req.on('data', chunk => {
            body += chunk;
        });

        req.on('end', () => {
            const updatedTask = JSON.parse(body);

            tasks = tasks.map(task =>
                task.id === taskId ? { ...task, ...updatedTask } : task
            );

            res.end(JSON.stringify({ message: "Task updated" }));
        });
    }

    else if (req.method === 'DELETE' && parsedUrl.pathname.startsWith('/tasks/')) {
        const taskId = parseInt(parsedUrl.pathname.split('/')[2]);

        tasks = tasks.filter(task => task.id !== taskId);

        res.end(JSON.stringify({ message: "Task deleted" }));
    }

    else {
        res.statusCode = 404;
        res.end(JSON.stringify({ message: "Route not found" }));
    }
});

server.listen(3000, () => {
    console.log("Server running on port 3000");
});
