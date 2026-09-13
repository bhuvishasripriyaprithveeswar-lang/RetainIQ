# RetainIQ Application Documentation

RetainIQ is an **Explainable AI-based Customer Churn Prediction and Retention Analytics Platform** designed and implemented as an MCA mini project. It integrates an interactive React single-page application (SPA) with a FastAPI backend to perform machine learning-driven churn analysis, customer segmentation, local/global SHAP explainability, and report exports.

Below is a detailed guide explaining every page, feature, and workflow in the application.

---

## 1. Navigation & Shell Layout (App Wrapper)

The application shell encapsulates the entire user experience. Once authenticated, the user is presented with a persistent layout consisting of a left-hand Sidebar and a Topbar.

### 1.1 Sidebar Navigation
- **Branding Header**: Displays the RetainIQ brain logo and title.
- **Navigation Links**: Directs users to the active pages:
  - **Dashboard**: High-level KPI metrics and visual charts.
  - **Predict Customer**: Form to calculate risk for a specific customer.
  - **Customer Segments**: Analytics regarding KMeans clusters.
  - **Analytics**: Global charts, feature importance, and model performance.
  - **Reports**: Historical records and PDF/CSV export tools.
  - **Settings**: Appearance and theme options.
- **Collapsible Toggle**: A button allowing the sidebar to be collapsed into an icon-only view for a wider content viewport.
- **User Profile Indicator**: Shows the user's name initials and full name.
- **Logout Action**: Terminates the session, clears saved states, and redirects the user to the Landing page.

### 1.2 Topbar Header
- **Dynamic Title**: Dynamically matches the active page (e.g., "Customer Segments", "Analytics").
- **Profile Badge**: A visual representation of the logged-in user profile initials.

---

## 2. Landing / Home Page

The Landing Page serves as the public entry point for visitors. It has been streamlined to focus on the academic and research nature of the project.

- **Branding Header Nav**: Features a logo, title, and quick-action **Sign In** and **Register** buttons.
- **Hero Section**:
  - **Core Academic Title**: *"AI-Powered Customer Churn Prediction and Retention Analytics Platform"*.
  - **Subtitle**: *"Predict customer churn, understand the reasons using explainable AI, and make data-driven retention decisions."*
  - **Actions**: Clean CTAs to Register or Sign In.
- **Hero Visualization Mockup**: A premium mock container showing a customer profile risk meter (Sarah Mitchell - 87% Risk), key risk drivers, KPI stats, and recommended loyalty discounts to prove the interface capabilities visually.
- **Key Features (4 Cards)**:
  1. *Hybrid Stacking Ensemble*: Combining XGBoost, LightGBM, and Logistic Regression for churn predictions.
  2. *SHAP Explainability*: Exposing individual risk factors to remove "black box" model concerns.
  3. *Customer Segmentation*: Grouping behavior profiles utilizing unsupervised KMeans clustering.
  4. *Analytics Dashboard*: SURFACING predict metrics, trends, and charts dynamically.
- **How RetainIQ Works (6-Step Pipeline)**: Displays the end-to-end flow:
  1. *Customer Data*: Database compilation.
  2. *Data Preprocessing*: Encoding, scaling, and feature engineering.
  3. *Hybrid Stacking Ensemble*: Stacked training of ensemble models.
  4. *SHAP Explainability*: Evaluating local SHAP value contribution.
  5. *Customer Segmentation (KMeans)*: Unsupervised grouping of customers.
  6. *Recommendations + Dashboard*: Presenting predictions and recommendation lists.
- **About RetainIQ**: Short academic description detailing the MCA mini project at PSG College of Technology.
- **Footer**: Academic credits for developers **Mithra N** and **Bhuvisha Sri Priya**, institutional affiliations, and copyright metadata.

---

## 3. User Authentication

RetainIQ utilizes JWT token-based authentication to guard routes, manage sessions, and secure requests.

### 3.1 Registration Page (`/register`)
- **Input Fields**: Full Name, Email Address, Password, and Confirm Password.
- **Client Validation**: Verifies that fields are non-blank, email formats are correct, passwords are at least 8 characters long, and confirmation passwords match.
- **Registration Pipeline**: Posts payload to `/auth/register`. On success, displays a green success notice and redirects the user to the Login page after 2 seconds.

### 3.2 Login Page (`/login`)
- **Input Fields**: Registered Email Address and Password.
- **Sign In Pipeline**: Posts credentials to `/auth/login` to obtain a JWT. On success, calls `saveSession` to store the token and user profile in `localStorage` and routes the user to the Dashboard.
- **Session Expiration Warning**: If a user attempts to refresh the app on a protected page but their JWT has expired, they are redirected to the Login page, and the login card displays: *"Your session has expired. Please sign in again."*

---

## 4. Dashboard

The Dashboard is the operational control center showing overall customer health.

- **KPI Cards**: Four metric cards displaying current values, direction indicators, and colors:
  - *Total Customers*: Total active and inactive dataset rows.
  - *Churn Risk Customers*: Number of customers currently marked as high-risk.
  - *Churn Rate*: Total churn percentage.
  - *Active Customers*: Customers marked as active.
- **Visual Analytics**: Interactive Recharts components representing churn rate trends and customer distributions.
- **Quick Links**: Navigation shortcuts that allow users to run a prediction directly or jump to details.

---

## 5. Predict Customer

This page allows users to calculate the churn probability of a specific customer by inputting their characteristics.

- **Interactive Feature Form**: Users input the customer's behavioral and demographic attributes:
  - *Customer ID* (Unique identifier)
  - *Credit Score* (Slider / Input, range 300 to 850)
  - *Age* (range 18 to 100)
  - *Tenure* (Number of years, range 0 to 10)
  - *Balance* (Account balance in USD)
  - *Number of Products* (Select drop-down, range 1 to 4)
  - *Has Credit Card* (Select: Yes/No)
  - *Is Active Member* (Select: Yes/No)
  - *Estimated Salary* (Salary in USD)
  - *Geography* (Select: France, Germany, Spain)
  - *Gender* (Select: Male, Female)
- **Utility Features**:
  - **Load Mock Customer Data**: A testing feature that automatically fills the form fields with preconfigured high-risk or low-risk attributes to demonstrate the prediction pipeline instantly.
  - **Clear Form**: Resets all form fields to default.
  - **Calculate Churn Risk**: Submits the payload to the backend `/predict` endpoint and routes the app to the **Prediction Result** screen.

---

## 6. Prediction Result

Surfaced immediately after running a churn calculation. This page visualizes the machine learning inference outputs.

- **Churn Risk Meter**: A radial circular gauge indicating the churn probability (0% to 100%).
  - **Colors**: Red (High risk, >= 75%), Orange/Yellow (Medium risk, >= 45%), Green (Low risk).
  - **Classification Badge**: Highlights whether the model predicts the customer "Will Churn" or "Will Stay".
- **Segment Grouping**: Highlights the customer's KMeans segment (e.g., *High Risk*, *High Value Loyal*, etc.).
- **Explainable AI (Local SHAP Values)**: Displays a horizontal bar chart of the key attributes driving the risk score.
  - **Positive Drivers**: Attributes increasing churn risk (rendered in Red).
  - **Negative Drivers**: Attributes decreasing churn risk (rendered in Green).
- **Personalized Recommendations**: SURFACES action plans dynamically generated by the recommendation engine based on the customer's segment and primary SHAP drivers (e.g., offering loyalty incentives, setting up dedicated customer success check-ins, or product discounts).
- **Actions**: Options to save, export, or test another customer.

---

## 7. Customer Segments

Provides details on KMeans clustering, showing characteristics of the four distinct behavioral groups.

- **Segments Statistics Table**: Displays details for each of the four KMeans clusters:
  - *High Value Loyal*
  - *High Churn Risk*
  - *Potential Growth*
  - *Low Engagement*
- **Characteristics Display**: Lists details including average tenure, average balances, product ownership, active member ratios, and cluster size for each cohort.
- **Segment Distribution Chart**: A Recharts Pie Chart indicating the size of each cluster relative to the entire customer base.

---

## 8. Analytics

Displays global analytics, feature importance, and verification statistics for the machine learning models.

- **Breakdown Metrics**: Graphs derived from the full processed dataset (fetched from backend `/analytics` routers):
  - *Geography Breakdown*: Churn counts and rates grouped by customer geography (France vs. Germany vs. Spain).
  - *Product Analysis*: Risk distribution grouped by the number of products held (1, 2, 3, or 4 products).
  - *Activity Analysis*: Active vs. Inactive customer churn distributions.
- **Global SHAP Summary**: A bar chart indicating the overall feature importance across the entire dataset (mean absolute SHAP values), revealing which attributes are the strongest predictors globally.
- **Model Verification Stats**: Visualizes the verification metrics for the Hybrid Stacking Ensemble:
  - *Accuracy* (e.g., 86%)
  - *ROC-AUC* (e.g., 91%)
  - *Precision*
  - *Recall*
  - *F1-Score*

---

## 9. Reports

This page maintains logs of prediction runs and supports downloading report sheets.

- **Prediction History Log**: Displays previously predicted customers, timestamps, and classifications.
- **Downloadable Reports**: Users can export a customer's prediction sheet:
  - **Export CSV**: Generates and downloads a `.csv` sheet containing customer attributes, risk probability, segment, and timestamp.
  - **Export PDF**: Renders a premium, print-ready HTML page representing the report card (containing prediction summary, top SHAP features, and AI recommendations) and opens the native browser print/PDF export dialog.

---

## 10. Settings

Allows users to manage their user account profile and customize their application layout.

- **User Profile Card**: Displays profile photo initials, name, and email address.
- **Theme Selection**: Toggles the application appearance between **Light**, **Dark**, and **System** mode. CSS styles adjust dynamically.
- **Accent Customization**: Provides options to change the primary accent color (e.g., Red, Orange, Blue, Green) to customize UI borders and primary buttons.
- **Logout Action**: Clears the authentication token and session information and redirects the user to the Landing page.
