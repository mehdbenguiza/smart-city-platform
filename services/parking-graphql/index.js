import dotenv from 'dotenv';
dotenv.config();
import { ApolloServer } from 'apollo-server-express';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

await mongoose.connect(process.env.MONGO_URI || 'mongodb://admin:secret123@mongo:27017/parking_db?authSource=admin');

const Parking = mongoose.model('Parking', new mongoose.Schema({
  name: String,
  totalSpaces: Number,
  availableSpaces: Number,
  pricePerHour: Number
}));

if (await Parking.countDocuments() === 0) {
  await Parking.insertMany([
    { name: "Parking Centre Ville", totalSpaces: 350, availableSpaces: 87, pricePerHour: 2.5 },
    { name: "Parking Gare Centrale", totalSpaces: 280, availableSpaces: 0, pricePerHour: 3.0 },
    { name: "Parking Université", totalSpaces: 450, availableSpaces: 312, pricePerHour: 1.8 },
    { name: "Parking Port", totalSpaces: 400, availableSpaces: 23, pricePerHour: 2.8 },
    { name: "Parking Hôpital", totalSpaces: 200, availableSpaces: 5, pricePerHour: 2.2 },
    { name: "Parking Aéroport", totalSpaces: 1200, availableSpaces: 789, pricePerHour: 4.0 },
    { name: "Parking Stade Olympique", totalSpaces: 800, availableSpaces: 0, pricePerHour: 3.5 },
    { name: "Parking Marché Central", totalSpaces: 220, availableSpaces: 67, pricePerHour: 2.0 },
    { name: "Parking Cinéma Plex", totalSpaces: 300, availableSpaces: 245, pricePerHour: 2.3 },
    { name: "Parking Plage Sud", totalSpaces: 700, availableSpaces: 598, pricePerHour: 3.2 },
    { name: "Parking Lycée Voltaire", totalSpaces: 150, availableSpaces: 42, pricePerHour: 1.5 },
    { name: "Parking Mairie", totalSpaces: 120, availableSpaces: 120, pricePerHour: 0 }
  ]);
}

const typeDefs = `
  type Parking {
    name: String!
    availableSpaces: Int!
    totalSpaces: Int!
    pricePerHour: Float!
  }
  type Query { parkings: [Parking!]! }
  type Mutation { reserveParking(name: String!): Parking! }
`;

const resolvers = {
  Query: {
    parkings: async () => await Parking.find().lean()
  },
  Mutation: {
    reserveParking: async (_, { name }) => {
      const parking = await Parking.findOne({ name });
      if (!parking || parking.availableSpaces <= 0) throw new Error("Complet");
      parking.availableSpaces -= 1;
      await parking.save();
      return parking;
    }
  }
};

const app = express();
app.use(cors({ origin: "*" }));

const server = new ApolloServer({ typeDefs, resolvers });
await server.start();
server.applyMiddleware({ app });

app.listen(3004, () => console.log('GraphQL OK → 3004'));
