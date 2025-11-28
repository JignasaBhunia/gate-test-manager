# GATE Test Manager

A comprehensive React-based application designed to help students track, manage, and analyze their performance in GATE (Graduate Aptitude Test in Engineering) mock tests.

## Features

### 📊 Dashboard & Test Management

- **Centralized Tracking**: View all your test attempts in a sortable and filterable table.
- **Advanced Filtering**: Filter tests by Platform, Subject, Type (Topic/Subject/Full), Status, and Date range.
- **Customizable View**: Toggle column visibility to focus on the metrics that matter to you.
- **Inline Editing**: Quickly update test details directly from the table without opening a modal.
- **CRUD Operations**: Easily Add, Edit, and Delete test records.
- **CSV Support**: Import test data from CSV or export your data for backup/external analysis.

### 📈 Analytics

- **Performance Charts**: Visualize your progress over time with "Marks vs Date" and "Percentile vs Date" charts.
- **Subject Analysis**: Breakdown of performance by subject to identify strong and weak areas.
- **Comparative Analysis**: Compare your performance against other users (if sync is enabled).

### ☁️ Sync & Settings

- **Cross-Device Sync**: Optional Firebase integration to sync your data across multiple devices.
- **Dark Mode**: Built-in dark mode for comfortable viewing at night.
- **Sidebar Navigation**: Intuitive sidebar for easy navigation between Dashboard, Analytics, and Settings.
- **Responsive Design**: Works seamlessly on desktop and mobile devices.

## Tech Stack

- **Frontend**: React 18 (via CDN)
- **Styling**: Custom CSS with Material Design 3 principles
- **Charts**: Chart.js
- **Build Tooling**: Babel Standalone (No Node.js build step required!)

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Edge, Firefox).
- A local web server (recommended to avoid CORS issues with local files).

### Installation & Run

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/JignasaBhunia/gate-test-manager.git
    cd gate-test-manager
    ```

2.  **Run the application:**
    Since this project uses Babel Standalone, you don't need `npm install` or `npm start`. However, for the best experience, serve the files using a local server.

    **Using VS Code:**

    - Install the "Live Server" extension.
    - Right-click `index.html` and select "Open with Live Server".

    **Using Python:**

    ```bash
    # Python 3
    python -m http.server 8000
    ```

    Then open `http://localhost:8000` in your browser.

3.  **Start Tracking:**
    - Add your first test manually or import a CSV file.
    - Configure Firebase in the "Sync" settings if you want cloud storage.

## Project Structure

- `index.html`: Main entry point containing libraries and styles.
- `src/App.jsx`: Main application logic and state management.
- `src/components/`: Reusable React components (`Table`, `Header`, `Analytics`).
- `src/config.js`: Configuration file (e.g., Firebase config).

## Deployment

### Vercel

1.  Push your code to a GitHub repository.
2.  Go to [Vercel](https://vercel.com/) and sign up/login.
3.  Click "Add New..." -> "Project".
4.  Import your GitHub repository.
5.  Vercel will automatically detect the settings. Since this is a static site with no build step (Babel Standalone), the default settings should work.
    - **Framework Preset**: Other
    - **Build Command**: (Leave empty)
    - **Output Directory**: (Leave empty or `.`)
6.  Click "Deploy".

## License

[MIT](LICENSE)
