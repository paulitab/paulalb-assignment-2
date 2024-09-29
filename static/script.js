// Description: This script handles the frontend interactions for the KMeans clustering algorithm.
// It sends requests to the backend server to generate a dataset, run KMeans, and step through the algorithm.
// It also handles manual centroid selection and updates the plot with the dataset, centroids, and clusters.
// by paula lopez burgos u32208249

let dataset = [];
let centroids = [];
let clusters = [];
let initMethod = 'random'; // Default initialization method
let k = 3; // Default number of clusters
let manualCenters = false; // Track if manual centroid selection is active

document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM fully loaded and parsed');

    // Attach event listeners
    document.getElementById('generate-dataset').addEventListener('click', function() {
        console.log('Generate Dataset clicked');
        generateDataset();
    });

    document.getElementById('run-kmeans').addEventListener('click', function() {
        console.log('Run KMeans clicked');
        runKMeans();
    });

    document.getElementById('step-through').addEventListener('click', function() {
        console.log('Step Through KMeans clicked');
        stepThroughKMeans();
    });

    document.getElementById('reset').addEventListener('click', function() {
        console.log('Reset clicked');
        resetAlgorithm();
    });

    document.getElementById('init-method').addEventListener('change', function() {
        initMethod = document.getElementById('init-method').value;
        console.log('Initialization method changed to:', initMethod);

        if (initMethod === 'manual') {
            manualCenters = true;
            manual();  // Enable manual centroid selection when manual is chosen
        } else {
            manualCenters = false;
            console.log('Manual centroid selection disabled.');
        }
    });
    generateDataset(); // Always generate a new dataset on load
});

// Generate a new dataset (always 100 points)
function generateDataset() {
    k = document.getElementById('k-value').value;  // Get the number of clusters (k) from the input box

    fetch('/generate_dataset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ num_points: 100 })  // Always generate 100 points
    })
    .then(response => response.json())
    .then(data => {
        console.log('Dataset generated:', data.dataset);
        dataset = data.dataset;  // Store the dataset globally
        drawPlot(dataset);  // Plot the dataset only, do not run KMeans
        manual();  // Ensure the listener is attached every time after plot re-rendering
    })
    .catch(error => console.error('Error generating dataset:', error));
}

// Enable manual centroid selection by clicking on the plot
function manual() {
    centroids = [];  // Clear any previous centroids
    manualCenters = true;  // Enable manual centroid selection
    console.log('Manual centroid selection enabled.');

    let plotDiv = document.getElementById('plot');  // Get the plot div

    // // Remove previous listeners before adding a new one
    plotDiv.removeAllListeners('plotly_click');

    console.log("Attaching plotly_click listener");
    attachClickListener(plotDiv);

    drawPlot(dataset);  // Re-draw the plot with the dataset
}

function attachClickListener(plotDiv) {
    // const epsilon = 0.1;  // Tolerance for centroid selection
    plotDiv.on('plotly_click', function(data) {
        // Get the clicked coordinates
        let x = data.points[0].x;
        let y = data.points[0].y;

        // Add the selected point as a centroid if it's not already selected
        if (centroids.length < k) {
            centroids.push([x, y]);
            console.log(`Centroid selected at: (${x}, ${y}). Total centroids: ${centroids.length}`);

            // Update the plot with selected centroids
            drawPlot(dataset, centroids);

            // Notify user once all centroids are selected
            if (centroids.length === k) {
                alert('You have selected all centroids. You can now run KMeans.');
            }
        } else {
            alert('Centroid selection limit reached.');
        }
        });
}

function runKMeans() {
    let k = parseInt(document.getElementById('k-value').value);  // Get the number of clusters (k)
    let initMethod = document.getElementById('init-method').value;

    // DEBUGGING paula
    console.log('Initialization method:', initMethod);
    console.log('Manual centroids:', centroids);
    console.log('K:', k);

    // Ensure all centroids are selected for manual method
    if (initMethod === 'manual' && centroids.length !== k) {
        alert(`Please select exactly ${k} centroids manually before running KMeans.`);
        return;  
        // Do not proceed if the centroids are not correctly selected
    }

    // First, call start_kmeans to initialize centroids and clusters
    fetch('/start_kmeans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            k: k,
            init_method: initMethod,
            manual_centroids: centroids
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'error') {
            alert(data.message);
            console.log('Error:', data.message);
        } else {
            centroids = data.centroids;
            clusters = data.clusters;
            console.log(`KMeans started with centroids:`, centroids);
            drawPlot(dataset, centroids, clusters);  
            // Update the plot after initialization

            // After centroids and clusters are initialized, run until convergence
            runUntilConvergence();  
            // Automatically step through until convergence
        }
    })
    .catch(error => console.error('Error during Run KMeans:', error));
}

// Run KMeans until convergence
function runUntilConvergence() {
    let k = parseInt(document.getElementById('k-value').value); 
    let initMethod = document.getElementById('init-method').value;

    fetch('/step_kmeans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            k: k,
            init_method: initMethod,
            manual_centroids: initMethod === 'manual' ? centroids : []  // Pass manual centroids if necessary
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'converged') {
            console.log('KMeans has converged!');
            alert('KMeans has converged!');
            // Final plot after convergence
            drawPlot(dataset, data.centroids, data.clusters);  
            
        } else if (data.status === 'stepping') {
            centroids = data.centroids;
            clusters = data.clusters;
            console.log('Iteration:', data.iteration);
            drawPlot(dataset, centroids, clusters);  
            // Update the plot after each step
            
            setTimeout(runUntilConvergence, 500);  
            // Continue iteration with delay
        }
    })
    .catch(error => console.error('Error during Run Until Convergence:', error));
}

// Step through KMeans one iteration at a time
function stepThroughKMeans() {
    let k = parseInt(document.getElementById('k-value').value); 
    let initMethod = document.getElementById('init-method').value;

    // Ensure all centroids are selected for manual method
    fetch('/step_kmeans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            k: k,
            init_method: initMethod,
            manual_centroids: initMethod === 'manual' ? centroids : []  // Pass manual centroids if necessary
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'converged') {
            console.log('KMeans has converged!');
            alert('KMeans has converged!');
        } else if (data.status === 'stepping') {
            centroids = data.centroids;
            clusters = data.clusters;
            console.log('Iteration:', data.iteration);
            drawPlot(dataset, centroids, clusters);  // Update the plot with new clusters and centroids
        }
    })
    .catch(error => console.error('Error during step through KMeans:', error));
}

function drawPlot(dataset = [], centroids = [], clusters = []) {
    let traces = [];
    // Define a color array for the clusters
    const colors = ['#FF6633', '#FFB399', '#FF33FF', '#FFFF99', '#00B3E6', '#E6B333', '#3366E6', '#999966', '#99FF99', '#B34D4D', '#80B300', '#809900', '#E6B3B3', '#6680B3', '#66991A', '#FF99E6', '#CCFF1A', '#FF1A66', '#E6331A', '#33FFCC', '#66994D', '#B366CC', '#4D8000', '#B33300', '#CC80CC', '#66664D', '#991AFF', '#E666FF', '#4DB3FF', '#1AB399', '#E666B3', '#33991A', '#CC9999', '#B3B31A', '#00E680', '#4D8066', '#809980', '#E6FF80', '#1AFF33', '#999933', '#FF3380', '#CCCC00', '#66E64D', '#4D80CC', '#9900B3', '#E64D66', '#4DB380', '#FF4D4D', '#99E6E6', '#6666FF'];

    // Plot the clustered dataset points
    if (clusters.length > 0) {
        for (let i = 0; i < clusters.length; i++) {
            const clusterPoints = clusters[i];  // Get points for each cluster
            let clusterTrace = {
                x: clusterPoints.map(point => point[0]),  // X-coordinates of points
                y: clusterPoints.map(point => point[1]),  // Y-coordinates of points
                mode: 'markers',
                type: 'scatter',
                marker: { size: 8, color: colors[i % colors.length] },  // Cycle through color array
                name: `Cluster ${i + 1}`
            };
            traces.push(clusterTrace);
        }
    } else if (dataset.length > 0) {
        // Plot unclustered dataset points (if clusters are not available)
        let dataTrace = {
            x: dataset.map(point => point[0]),  // Extract x-coordinates
            y: dataset.map(point => point[1]),  // Extract y-coordinates
            mode: 'markers',
            type: 'scatter',
            marker: { size: 8, color: 'blue' },  // Data points are blue by default
            name: 'Data Points'
        };
        traces.push(dataTrace);
    }

    // Plot the centroids if they exist
    if (centroids.length > 0) {
        let centroidTrace = {
            x: centroids.map(point => point[0]),  // X-coordinates of centroids
            y: centroids.map(point => point[1]),  // Y-coordinates of centroids
            mode: 'markers',
            type: 'scatter',
            marker: { size: 12, color: 'red', symbol: 'x' },  // Centroids are red Xs
            name: 'Centroids'
        };
        traces.push(centroidTrace);
    }

    let layout = {
        title: `KMeans Clustering (k = ${k} Clusters)`,
        xaxis: { title: 'X Axis' },
        yaxis: { title: 'Y Axis' }
    };

    // Update the plot without recreating it
    Plotly.react('plot', traces, layout);
}

// Clear the plot
function clearPlot() {
    Plotly.purge('plot'); 
    console.log('Plot cleared');
}

// Reset the algorithm to its initial state
// This will clear the centroids and clusters but keep the dataset
function resetAlgorithm() {
    console.log('Reset clicked');

    fetch('/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'reset') {
            console.log('State has been reset');
            // Clear frontend state (centroids, clusters)
            centroids = [];
            clusters = [];

            // Log the dataset returned by the backend
            console.log('Dataset after reset:', data.dataset);  // Debugging log to ensure dataset is received - paula
            
            // Check if dataset is properly defined before using it
            if (data.dataset && data.dataset.length > 0) {
                dataset = data.dataset;  // Assign the dataset from the backend to the global variable
                drawPlot(dataset);  // Re-plot the dataset (without centroids or clusters)
            } else {
                console.error('No dataset returned from the server after reset.');
            }
        }
    })
    .catch(error => console.error('Error during reset:', error));
}

