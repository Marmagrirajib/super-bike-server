const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;
const jwt = require('jsonwebtoken');


app.use(cors());
app.use(express.json());

//function
function JWTverify(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized Access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next();
    });
}




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.twxex.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });





async function run() {
    try {
        await client.connect();
        const partsCollection = client.db("bike").collection("parts");
        const ordersCollection = client.db("bike").collection("orders");
        const profileCollection = client.db('bike').collection('profiles');
        const usersCollection = client.db('bike').collection('users');



        app.get('/part', async (req, res) => {
            const query = {};
            const cursor = partsCollection.find(query);
            const parts = await (await cursor.toArray()).reverse();
            res.send(parts);
        })
        app.get('/order', async (req, res) => {
            const orders = await ordersCollection.find().toArray();
            res.send(orders)
        })

        app.delete('/order/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const tools = await ordersCollection.deleteOne(query);
            res.send(tools);
        })
        app.get('/part/:id', async (req, res) => {
            const id = req.params;
            const query = { _id: ObjectId(id) };
            const part = await partsCollection.findOne(query);
            res.send(part);
        })
        app.post('/orders', async (req, res) => {
            const orders = req.body;
            const result = await ordersCollection.insertOne(orders);
            res.send(result)
        })


        app.get('/orders', async (req, res) => {

            const email = req.query.email;

            const query = { email };
            const cursor = ordersCollection.find(query);
            const result = await cursor.toArray();
            return res.send(result);

        })


        //addNewItem


        app.post('/part', async (req, res) => {
            const item = req.body;
            const result = await partsCollection.insertOne(item);
            res.send(result)
        })


        // createUser

        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '6h' })
            res.send({ result, token });
        })



        //updateProfile


        app.put('/profile/:email', async (req, res) => {
            const email = req.params.email;
            const updatedInfo = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    customerName: updatedInfo.customerName,
                    education: updatedInfo.education,
                    location: updatedInfo.location,
                    phone: updatedInfo.phone
                }
            };
            const result = await profileCollection.updateOne(filter, updatedDoc, options);
            res.send(result);

        })



        //getMyProfile


        app.get('/profile/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await profileCollection.findOne(query);
            res.send(user);
        })



        //getUserForAdmin

        
        app.get('/user', async (req, res) => {
            const users = await usersCollection.find().toArray();
            res.send(users)
        })

      
        app.put('/user/admin/:email', JWTverify, async (req, res) => {
            const email = req.params.email;
            const requester = req.decoded.email;
            const reqAcc = await usersCollection.findOne({ email: requester });
            if (reqAcc.role === 'admin') {
                const filter = { email: email };
                const updateDoc = {
                    $set: { role: 'admin' },
                };
                const result = await usersCollection.updateOne(filter, updateDoc);

                res.send(result);
            }
            else {
                res.status(403).send({ message: 'Forbidden' })
            }

        })


        //useAdmin
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await usersCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin })
        })


    } finally {
        // await client.close();
    }
}
run().catch(console.dir);






app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})