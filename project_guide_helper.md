# RetainIQ Project Guide: Machine Learning & Analytics Explanations

This document is designed to help you present and explain the RetainIQ project to your project guide. It highlights the machine learning models used, dataset characteristics, interpretations of every chart/graph, and details which components run on real ML pipelines vs. illustrative mock metrics.

---

## 1. Project Overview & Machine Learning Architecture

When explaining the project to your guide, emphasize the **three main pillars** of the machine learning pipeline:

### 1.1 Hybrid Stacking Ensemble (Supervised Learning)
- **What it is**: A stacking classifier combining multiple base classifiers whose outputs are aggregated by a meta-classifier.
  - **Base Learners**: **XGBoost** and **LightGBM** (highly optimized Gradient Boosted Decision Trees that excel at tabular classification).
  - **Meta-Learner**: **Logistic Regression** (blends the prediction probabilities of the base learners for the final classification).
- **Academic Rationale**: Stacking reduces the bias and variance associated with individual models, providing superior classification metrics (Accuracy: **~86%**, ROC-AUC: **~91%**) on tabular structured bank data.

### 1.2 Explainable AI via SHAP (Local & Global Explanations)
- **What it is**: SHAP (SHapley Additive exPlanations) is a game-theoretic approach to explain model outputs.
- **Academic Rationale**: Deep ensemble models are "black boxes". SHAP computes shapley value attributions for each input feature, breaking down the exact reason a customer got a specific risk score (e.g. why a customer has an 87% risk). It separates factors into **positive drivers** (increasing risk, e.g. German residency or high age) and **negative drivers** (decreasing risk, e.g. being an active member).

### 1.3 Customer Segmentation via KMeans (Unsupervised Learning)
- **What it is**: KMeans clustering groups the customer base into distinct cohorts based on behavioral similarities.
- **Academic Rationale**: Once risk is predicted, a bank needs operational clusters to take action. The project segments customers into **four distinct clusters**:
  1. *High Value Loyal*: High tenure, high balances, active, very low risk.
  2. *High Churn Risk*: Older age profiles, high balances, low activity, high churn rate.
  3. *Potential Growth*: High credit scores, average tenure, low product count (ideal for cross-selling).
  4. *Low Engagement*: Low product counts, inactive, medium risk.

---

## 2. Dataset Characteristics

- **Dataset**: Standard Customer Churn dataset containing **10,000 customer records**.
- **Target Variable**: `Exited` (1 = Churned, 0 = Retained).
- **Features**:
  - `CreditScore` (300 to 850): Financial creditworthiness.
  - `Age` (18 to 100): Demographic age.
  - `Tenure` (0 to 10 years): Duration of relation with bank.
  - `Balance` ($): Funds held in accounts.
  - `NumOfProducts` (1 to 4): Number of distinct products held.
  - `HasCrCard` (Binary): Possesses a credit card.
  - `IsActiveMember` (Binary): Transacted actively in recent times.
  - `EstimatedSalary` ($): Yearly salary.
  - `Geography` (France, Germany, Spain): Geographical location.
  - `Gender` (Male, Female): Customer gender.

---

## 3. Page-by-Page Graph, Chart & Feature Explanations

Here is a detailed explanation of what is shown on each screen, how to interpret the data, and how to explain it to your guide.

### 3.1 Dashboard (Overview)
- **KPI Metrics (Total Customers, Churned, Churn Rate, Active)**: 
  - *Explanation*: Real counts fetched from the backend `/analytics/summary` endpoint. Represents the summary of the active pandas DataFrame.
- **Churn Rate Trend (Area Chart)**:
  - *Explanation*: Displays the monthly churn percentage over 8 months.
  - *Project Guide Note (Important)*: Since the active churn dataset is cross-sectional (each row is a unique customer at a static point in time with no historical time-series dates), this chart is populated using **illustrative monthly data** in the frontend to demonstrate how a time-series deployment would render churn trends over time.
- **Customer Segments (Donut Chart)**:
  - *Explanation*: Shows the distribution of customer percentages across the KMeans clusters. Populated dynamically from real KMeans prediction runs over the dataset on the backend.
- **Recent Predictions & AI Insights**:
  - *Explanation*: Displays a list of recent predictions and contextual operational warnings. Implemented as **illustrative/mock data** to populate the overview shell immediately upon loading.

### 3.2 Predict Customer (Single Inference Input)
- **Features**: Input form for demographic/behavioral variables + **"Load Mock Customer Data"** utility.
- **Project Guide Note**: The "Load Mock Customer Data" button is a testing utility that populates the form with sample high-risk or low-risk parameters. However, when you click **"Calculate Churn Risk"**, the application sends the actual form inputs via a **live HTTP POST request** to the backend `/predict` endpoint, executing the Stacking Ensemble classifier and SHAP explainer in real time.

### 3.3 Prediction Result (Inference Output)
- **Risk Meter (Radial Gauge)**: 
  - *Explanation*: Renders the exact churn probability from the stacking model. Red represents high risk (>=75%), Orange/Yellow is medium (>=45%), and Green is low risk.
- **KMeans Cluster Tag**: Shows the unsupervised cluster classification.
- **Local SHAP Feature Importance (Horizontal Bar Chart)**:
  - *Explanation*: Displays features that affected this specific customer's score.
  - *How to interpret*: Red bars (positive values) show features that dragged the customer toward churning (e.g. high Age or low Activity). Green bars (negative values) show factors keeping the customer loyal (e.g. high Credit Score).
- **Personalized Recommendations**:
  - *Explanation*: Rule-based AI retention suggestions mapped dynamically based on the predicted segment and highest SHAP risk driver.

### 3.4 Customer Segments (KMeans Analysis)
- **Cluster Stats Grid**: 
  - *Explanation*: Real, dynamically calculated metrics from KMeans models showing sizes, balances, and tenure averages for each of the 4 clusters.
- **Segment Pie Chart**:
  - *Explanation*: Visualizes relative cluster volumes.

### 3.5 Analytics (Global Visualizations)
All charts on this page are **fully real and dynamic**, populated from the backend `/analytics/` routers based on the active dataset:
- **Geography Breakdown (Bar Chart)**:
  - *Interpretation*: Displays total customers vs. churned count by country. Germany typically shows the highest churn rates, highlighting potential service or regional competitiveness issues.
- **Product Analysis (Line Chart)**:
  - *Interpretation*: Charts churn rates by number of products held. Customers with 3 or 4 products have extremely high churn rates (~80%+), indicating that multi-product configurations in legacy databases are strong markers of attrition risk.
- **Activity Analysis (Bar Chart)**:
  - *Interpretation*: Compares active vs. inactive members. Inactive members are significantly more prone to churn.
- **Model Performance Metrics**:
  - *Interpretation*: Lists Accuracy, F1, Recall, Precision, and ROC-AUC scores, calculated on the test split, proving model validity.
- **Global SHAP Summary (Bar Chart)**:
  - *Interpretation*: Displays the mean absolute SHAP values over the entire dataset. 
  - *Key Takeaway*: **Age** is the most powerful global predictor of churn in this dataset, followed closely by **NumOfProducts** and **IsActiveMember**.

### 3.6 Reports (Logs & Exports)
- **Interactive Report Export**:
  - **Export CSV**: Generates a standard data spreadsheet file containing all customer variables and inference results.
  - **Export PDF**: Compiles a printable prediction card (risk score, SHAP attributions, recommendations) and opens the system print window natively.

---

## 4. Verification Check: Real ML Pipeline vs. Mock/Illustrative Data

To answer your guide's questions regarding data authenticity, use this summary:

| Component / Feature | Data Source | Rationale |
| :--- | :--- | :--- |
| **Predict Single Customer Form** | **Real ML Pipeline** | Invokes trained XGBoost + LightGBM + Logistic Regression models on FastAPI. |
| **Prediction Result Risk Meter** | **Real ML Pipeline** | Outputs the actual probability calculated by the ensemble. |
| **Local SHAP Bar Chart** | **Real ML Pipeline** | Calculates Shapley values dynamically on the server. |
| **Customer Segments (KMeans)** | **Real ML Pipeline** | Segments dataset dynamically using a pre-trained KMeans model. |
| **Analytics (Geography, Products, Activity)** | **Real ML Pipeline** | Calculated dynamically by pandas grouping on the dataset. |
| **Model Performance Metrics** | **Real ML Pipeline** | Evaluated on validation splits using scikit-learn metrics. |
| **Global SHAP Summary Chart** | **Real ML Pipeline (Pre-computed)** | Loaded from `shap_summary.json` to prevent server slowdowns. |
| **Dashboard Churn Trend Area Chart** | *Illustrative/Mock* | Dataset lacks time-series dates; simulated for visualization. |
| **Dashboard Revenue at Risk Bar Chart** | *Illustrative/Mock* | Simulated metrics used to model financial impact dashboards. |
| **Dashboard Recent Predictions List** | *Illustrative/Mock* | Static initial list representing sample user entries. |
| **Dashboard AI Insights Cards** | *Illustrative/Mock* | Simulated advisory cards to show operational intelligence features. |
| **Reports Historical Logs List** | *Illustrative/Mock* | Fallback dataset logs displaying sample historical runs. |
