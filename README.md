# ResilientPath AI

<div align="center">
  <h3>Predictive Infrastructure & Smart Resource Allocation Platform</h3>
  <p><i>Official Submission for the Google Solution Challenge 2026</i></p>
</div>

## 🌍 The Problem: Trillions Wasted on Broken Infrastructure
Worldwide, municipal infrastructure suffers from chronic underfunding, corruption, and reactive maintenance. Cities spend billions fixing the same potholes because contractors cut corners, knowing they will be paid again when the road breaks. This leads to massive capital waste and dangerous urban environments.

## 🚀 The Solution: "Road-as-a-Service"
**ResilientPath AI** eliminates infrastructure corruption and completely automates the municipal repair cycle using a trustless economic model. 

Instead of paying contractors upfront for a job, ResilientPath uses Google AI to monitor the road over time. Contractors receive an instant baseline payout, but their final 15% escrow bonus is only released if our AI verifies the road is still intact 12 months later. 

## 🏆 UN Sustainable Development Goals Addressed
*   **SDG 9 (Industry, Innovation and Infrastructure):** Building resilient infrastructure using predictive ML analytics and edge-computing.
*   **SDG 11 (Sustainable Cities and Communities):** Ensuring safe, affordable, and accessible urban transport systems by eliminating road hazards in real-time.

---

## 🛠 Google Developer Technologies Used

This project was built entirely on the Google Developer ecosystem to maximize scalability and edge performance:

### 1. TensorFlow.js (TF.js)
We trained a custom MobileNetV2 model using **Google Teachable Machine** and deployed it directly to the browser via **TensorFlow.js**. 
*   **Innovation:** Because the AI runs on the edge (device-side), the scanner works natively on any browser with zero server cost and extreme privacy. 

### 2. Google Gemini 1.5 Pro (Multimodal AI)
To prevent contractors from uploading fake photos to claim repair bounties, we integrated the **Google Gemini API**.
*   **Innovation:** Gemini acts as our "Fraud Detection Agent." It compares the user's submitted camera photo against live satellite imagery to mathematically verify that the road damage actually exists at that GPS coordinate.

### 3. Firebase (Firestore & Hosting)
We use **Firebase Firestore** as our real-time, NoSQL ticketing ledger.
*   **Innovation:** We enabled `IndexedDbPersistence` in Firestore so our mobile scanner can operate completely offline in remote rural areas with no cell service, automatically syncing tickets when the truck returns to Wi-Fi.

### 4. Google Maps JavaScript API
*   **Innovation:** We render real-time geospatial dispatch maps to cluster infrastructure damage, allowing city planners to deploy single repair crews to clustered zones, saving up to 40% in fuel and labor.

---

## 💻 How to Run the Code

1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/resilientpath.git
   ```
2. Navigate to the directory:
   ```bash
   cd resilientpath
   ```
3. Open `index.html` in your browser, or run a local server:
   ```bash
   python -m http.server 8000
   ```
   *(Note: Accessing the camera requires serving the file over HTTPS or `localhost`)*

## 📈 The Civic-Yield Simulator
The dashboard includes our novel **Civic-Yield Simulator**, which visualizes our economic model using Chart.js. It mathematically proves how the ResilientPath escrow system financially punishes corrupt contractors (Contractor A) and heavily rewards sustainable, high-quality builders (Contractor B).

---
*Built with ❤️ for the Google Solution Challenge 2026*
