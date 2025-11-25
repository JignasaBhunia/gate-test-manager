# GATE CSE 2026 Test Manager

🎯 **Comprehensive test tracking system for GATE CSE 2026 preparation**

## Features

✅ **242 Complete Tests** - All tests from GO Classes (112), Made Easy (48), and Gate At Zeal (82)
✅ **Live Data Loading** - Automatically loads from GitHub CSV
✅ **Advanced Filtering** - Filter by platform, subject, type, status, or search
✅ **Editable Scores** - Track obtained marks and potential marks
✅ **Status Tracking** - Update test status (Not Started/Pending/Completed)
✅ **Detailed Test Editor** - Edit all test details including syllabus, links, dates
✅ **CSV Export** - Download updated data with all your changes
✅ **Responsive Design** - Works perfectly on desktop and mobile

## Data Structure

The `tests_seed.csv` contains:
- **id** - Unique test identifier
- **platform** - GO Classes, Made Easy, or Gate At Zeal
- **name** - Test name
- **date** - Scheduled/completion date
- **type** - Topic, Subject, Full, or Mock
- **subject** - Subject area
- **questions** - Number of questions
- **marks** - Total marks
- **time** - Duration in minutes
- **syllabus** - Topics covered
- **link** - Direct link to test (if available)
- **remarks** - Additional notes
- **status** - Not Started, Pending, or Completed
- **marks_obtained** - Your actual score
- **potential_marks** - Score without silly mistakes

## How to Use

### Viewing Tests
1. Open `index.html` in your browser
2. All 242 tests load automatically from GitHub
3. Use filters to find specific tests
4. Click column headers to sort

### Adding Scores
1. Click on "Obtained" or "Potential" cells
2. Enter your marks
3. Press Enter or click outside to save

### Editing Test Details
1. Click "Edit" button on any test row
2. Update any field (name, date, syllabus, link, etc.)
3. Click "Save Changes"

### Exporting Data
1. Click "Download CSV" button
2. Save the file with all your updates
3. Upload back to GitHub to sync across devices

## Platform Details

### GO Classes (112 tests)
- Discrete Mathematics: 8 tests
- Engineering Mathematics: 8 tests
- Digital Logic: 7 tests
- DBMS: 8 tests
- C Programming: 6 tests
- TOC: 8 tests
- Computer Networks: 7 tests
- Compiler Design: 6 tests
- COA: 7 tests
- Operating Systems: 7 tests
- Data Structures: 8 tests
- Algorithms: 7 tests
- Mock Tests: 20 tests
- Combined Full Tests: 4 tests

### Made Easy (48 tests)
- Topic Tests: 30 tests
- Subject Tests: 6 tests
- Full Tests: 6 tests
- Mock Tests: 6 tests

### Gate At Zeal (82 tests)
- Topic Tests: 36 tests
- Full Tests: 12 tests
- Round 1 Mock Tests: 10 tests
- Round 2 Mock Tests: 10 tests
- Round 3 Finale Tests: 12 tests
- Aptitude Tests: 2 tests

## Future Enhancements

🔜 **Cloud Sync** - Firebase integration for multi-device sync
🔜 **Analytics Dashboard** - Charts and performance tracking
🔜 **Test Reminders** - Schedule notifications
🔜 **Progress Reports** - Detailed analysis and insights

## Technical Stack

- **Frontend**: React 18 (CDN)
- **Styling**: Custom CSS with responsive design
- **Data**: CSV file from GitHub
- **Export**: Client-side CSV generation

## Setup

1. Clone the repository
2. Open `index.html` in any modern browser
3. That's it! No build process required

## Contributing

Feel free to submit issues or pull requests for:
- Bug fixes
- Feature enhancements
- Test data corrections
- UI improvements

## License

MIT License - Free to use for GATE CSE preparation

---

**Good luck with your GATE CSE 2026 preparation! 🚀**