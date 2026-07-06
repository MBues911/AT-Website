
let toggle = document.getElementById('check');
let knopf1 = document.getElementById('links');
let knopf2 = document.getElementById('mitte');
let knopf3 = document.getElementById('rechts');
let box1 = document.getElementById('box1');
let box2 = document.getElementById('box2');
let box3 = document.getElementById('box3');
	knopf1.addEventListener('click', function () {
		box1.style.backgroundColor = 'red';
		box2.style.backgroundColor = 'red';
		box3.style.backgroundColor = 'red';
	});
	
	knopf2.addEventListener('click', function () {
		box1.style.backgroundColor = 'green';
		box2.style.backgroundColor = 'green';
		box3.style.backgroundColor = 'green';
	});
	
	knopf3.addEventListener('click', function () {
		box1.style.backgroundColor = 'blue';
		box2.style.backgroundColor = 'blue';
		box3.style.backgroundColor = 'blue';
	});

check.addEventListener('change', function() {
    if (toggle.checked === true) {
        box1.style.backgroundColor = '#ff00ff'; 
    } else {
        box1.style.backgroundColor = '#2ecc71';
    }
});