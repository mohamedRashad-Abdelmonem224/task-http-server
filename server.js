const http = require("http");
const fs = require("fs").promises;
const path = require("path");

const filePath = path.join(__dirname, "books.json");

async function readBooks() {
    try {
        const data = await fs.readFile(filePath, "utf8");
        return data.trim() ? JSON.parse(data) : [];
    } catch (err) {
        if (err.code === "ENOENT") {
            await fs.writeFile(filePath, JSON.stringify([], null, 2));
            return [];
        }
        throw err;
    }
}

const server = http.createServer(async (req, res) => {
    const pathname = req.url;
    const method = req.method;

    res.setHeader("Content-Type", "application/json");

    try {
        if (method === "GET" && pathname === "/books") {
            const books = await readBooks();
            res.writeHead(200);
            return res.end(JSON.stringify(books));
        }
        else if (method === "GET" && /^\/books\/\d+$/.test(pathname)) {
            const id = Number(pathname.split("/")[2]); 
            const books = await readBooks();
            const book = books.find((b) => b.id === id);

            if (!book) {
                res.writeHead(404);
                return res.end(JSON.stringify({ message: "Book not found" }));
            }

            res.writeHead(200);
            return res.end(JSON.stringify(book));
        }
        else if (method === "POST" && pathname === "/books") {
            let body = "";
            for await (const chunk of req) {
                body += chunk;
            }

            let newBook;
            try {
                newBook = JSON.parse(body);
            } catch {
                res.writeHead(400);
                return res.end(JSON.stringify({ message: "Invalid JSON" }));
            }

            if (!newBook.title || !newBook.author) {
                res.writeHead(400);
                return res.end(JSON.stringify({ message: "Title and Author are required" }));
            }

            const books = await readBooks();
            const maxId = books.length > 0 ? Math.max(...books.map((b) => b.id || 0)) : 0;
            
            const bookToSave = {
                id: maxId + 1,
                title: newBook.title,
                author: newBook.author,
                year: Number(newBook.year) || 2000,
                available: typeof newBook.available === "boolean" ? newBook.available : true
            };

            books.push(bookToSave);
            await fs.writeFile(filePath, JSON.stringify(books, null, 2));
            
            res.writeHead(201);
            return res.end(JSON.stringify(bookToSave));
        }
        else if (method === "PUT" && /^\/books\/\d+$/.test(pathname)) {
            const id = Number(pathname.split("/")[2]);
            let body = "";
            for await (const chunk of req) {
                body += chunk;
            }

            let updates;
            try {
                updates = JSON.parse(body);
            } catch {
                res.writeHead(400);
                return res.end(JSON.stringify({ message: "Invalid JSON" }));
            }

            const books = await readBooks();
            const bookIndex = books.findIndex((b) => b.id === id);

            if (bookIndex === -1) {
                res.writeHead(404);
                return res.end(JSON.stringify({ message: "Book not found" }));
            }

            books[bookIndex] = {
                ...books[bookIndex],
                ...updates,
                id: books[bookIndex].id 
            };

            await fs.writeFile(filePath, JSON.stringify(books, null, 2));

            res.writeHead(200);
            return res.end(JSON.stringify(books[bookIndex]));
        }
        else if (method === "DELETE" && /^\/books\/\d+$/.test(pathname)) {
            const id = Number(pathname.split("/")[2]); 
            const books = await readBooks();
            
            const updatedBooks = books.filter((book) => book.id !== id);

            if (updatedBooks.length === books.length) {
                res.writeHead(404);
                return res.end(JSON.stringify({ message: "Book not found" }));
            }
            await fs.writeFile(filePath, JSON.stringify(updatedBooks, null, 2));
            res.writeHead(200);
            return res.end(JSON.stringify({ message: "Book deleted successfully" }));
        }
        else {
            res.writeHead(404);
            return res.end(JSON.stringify({ message: "Route Not Found" }));
        }

    } catch (error) {
        console.error("System Error:", error);
        res.writeHead(500);
        return res.end(JSON.stringify({ message: "Internal Server Error" }));
    }
});

server.listen(8080, () => {
    console.log("Library API Server Running on http://localhost:8080");
});


