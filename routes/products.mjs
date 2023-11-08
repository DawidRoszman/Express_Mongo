import express from "express";
import db from "../db/conn.mjs";
import { ObjectId } from "mongodb";

const router = express.Router();

router.get("/report", async (req, res) => {
  const collection = await db.collection("products");
  const results = await collection
    .aggregate([
      {
        $project: {
          _id: 0,
          name: 1,
          amount: 1,
          totalPrice: {$multiply: ["$price", "$amount"]},
        }
      }
    ])
    .toArray();
  res.send(results);
});
router.get("/", async (req, res) => {
  const queryParams = req.query;

  let query = {};
  let sort = {};
  // // filter by name
  if (queryParams.name) {
    query = { ...query, name: { $regex: queryParams.name, $options: "i" } };
  }
  if (queryParams.price) {
    query = { ...query, price: { $lte: parseInt(queryParams.price) } };
  }
  if (queryParams.amount) {
    query = { ...query, amount: { $lte: parseInt(queryParams.amount) } };
  }
  if (queryParams.sortBy) {
    if (queryParams.direction === "desc") {
      sort = { [queryParams.sortBy]: -1 };
    } else {
      sort = { [queryParams.sortBy]: 1 };
    }
  }

  const collection = await db.collection("products");
  const results = await collection.find(query).sort(sort).toArray();

  res.send(results).status(200);
});

router.get("/:id", async (req, res) => {
  const collection = await db.collection("products");
  try {
    const id = new ObjectId(req.params.id);
    const result = await collection.findOne({ _id: id });
    res.send(result);
  } catch {
    res.status(404).send("Id not found!");
  }
});
router.post("/", async (req, res) => {
  const collection = await db.collection("products");
  const checkIfExistsWithGivenId = await collection.findOne({
    name: req.body.name,
  });
  if (checkIfExistsWithGivenId) {
    res.status(400).send("Product with that name already exists");
    return;
  }
  let result = await collection.insertOne(req.body);
  res.status(201).location().send(result);
});

router.put("/:id", async (req, res) => {
  const collection = await db.collection("products");
  try {
    const id = new ObjectId(req.params.id);
    const checkIfExistsWithGivenId = await collection.findOne({
      _id: { $ne: id },
      name: req.body.name,
    });
    if (checkIfExistsWithGivenId) {
      res.status(400).send("Product with that name already exists");
      return;
    }
    await collection.findOneAndUpdate({ _id: id }, { $set: req.body });
    res.status(204).send();
  } catch {
    res.status(404).send();
  }
});

router.delete("/:id", async (req, res) => {
  let collection = await db.collection("products");
  try {
    const id = new ObjectId(req.params.id);
    if (await collection.findOne({ _id: id })) {
      await collection.deleteOne({ _id: id });
      res.status(204).send();
      return;
    }
  } finally {
    res.status(404).send("Id not found!");
  }
});

export default router;
