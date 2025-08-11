# --- Recipe for the Brain Container ---

# Step 1: Start with a lightweight version of Node.js
FROM node:18-slim

# Step 2: Set the main working folder inside the container
WORKDIR /app

# Step 3: Copy the instruction manual (package.json) first.
# This is a clever trick. Docker only re-runs this step if the file changes,
# which saves a lot of time when you change your code later.
COPY package*.json ./

# Step 4: Install all the parts needed by the brain
RUN npm install

# Step 5: Copy the rest of the brain's code (like index.js)
COPY . .

# Step 6: Tell Docker that the brain listens on door number 5001
EXPOSE 5001

# Step 7: The final command to run when the container starts
CMD [ "node", "index.js" ]