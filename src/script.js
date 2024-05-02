/* Only register a service worker if it's supported */
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('src/service-worker.js');
}

function calculate() {
    const remainingPrizepool = parseInt(document.getElementById("remainingPrizepool").value);
    const remainingPlayers = parseInt(document.getElementById("remainingPlayers").value);
	const initialRatio = parseFloat(document.getElementById("initialRatio").value);
	const beta = parseFloat(document.getElementById("beta").value);
	const ratioLimit = parseFloat(document.getElementById("ratioLimit").value);
    const rounding = parseFloat(document.getElementById('rounding').value);

	let placeValues = calcPlaceValues(remainingPlayers, false);
	let ratios = calculateRatios(placeValues, initialRatio, beta, ratioLimit);
	let prizes = calculatePrizes(ratios, remainingPrizepool, rounding);

    return prizes;
}

function showPayouts(payouts) {
    const payouttable = document.getElementById('payouttable');
    payouttable.textContent = '';
    const headTemplate = document.getElementById('headTemplate').content;
    payouttable.appendChild(document.importNode(headTemplate, true));
    const template = document.getElementById('rowtemplate').content;
    payouts.forEach((v, i) => {
		if (v >= 1) {
			const row = document.importNode(template, true);
			row.querySelector('.place').innerHTML = i;
			row.querySelector('.payout').innerHTML = v;
			payouttable.appendChild(row);
		}
    });
}

/**
 * @param {string} url 
 */
function parseQuery(url) {
    const markIndex = url.indexOf("?");
    if (markIndex === -1) return {};
    const query = url.substring(markIndex + 1);
    const pairs = query.split("&");
    return pairs.map((pair) => {
        return pair.split("=");
    }).reduce((map, kvList) => {
        map[kvList[0]] = kvList[1];
        return map;
    }, {});
}

/**
 * @returns {object}
 */
function getPayoutRatio() {
    return payoutRatio;
}

function calcPlaceValues(players, samePrizes) {
    let result = Array(players + 1).fill(0.0);
    for (let i = 1; i <= players; i++) {
        result[i] = i;
    }
    if (samePrizes) {
        if (players <= 10) {
            let cur = 5 - players % 2;
            while (cur < players) {
                let avg = (result[cur] + result[cur + 1]) / 2.0;
                result[cur] = avg;
                result[cur + 1] = avg;
                cur += 2;
            }
        } else {
            let cur = 10;
            while (cur <= Math.min(16, players)) {
                let avg = 0.0;
                let amt = 0;
                for (let t = 0; t <= 2; t++) {
                    if (cur + t > players) {
                        continue;
                    }
                    avg += result[cur + t];
                    amt++;
                }
                avg /= amt;
                for (let t = 0; t < amt; t++) {
                    result[cur + t] = avg;
                }
                cur += 3;
            }
            while (cur < players) {
                let avg = 0.0;
                let amt = 0;
                for (let t = 0; t <= 9; t++) {
                    if (cur + t > players) {
                        continue;
                    }
                    avg += result[cur + t];
                    amt++;
                }
                avg /= amt;
                for (let t = 0; t < amt; t++) {
                    result[cur + t] = avg;
                }
                cur += 9;
            }
        }
    }
    return result;
}

function calculateRatios(placeValues, firstSecondRatio, beta, ratioLimit) {
    const playersAmt = placeValues.length - 1;

    let result = Array(playersAmt + 1).fill(0.0);

    for (let i = 1; i <= playersAmt; i++) {
        let x = placeValues[i];
        let f = 100.0; // f(1)
        let pow2 = 1.0;
        let ratio = firstSecondRatio;
        while (pow2 * 2 < x) {
            pow2 *= 2;
            f /= ratio;
            ratio *= beta;
            ratio = Math.min(ratio, ratioLimit);
        }

        // pow2, f - value of f(pow2)
        let curpow = Math.log2(ratio);
        // f(x) = t / x ^ curpow
        // f(pow2) = t / pow2^curpow  =>  t = f(pow2) * pow2^curpow
        let t = f * Math.pow(pow2, curpow);
        // y = f(placeValues[i])
        let y = t / Math.pow(x, curpow);
        result[i] = y;
    }

    // normalize
    let sum = result.reduce((acc, val) => acc + val, 0);
    for (let i = 1; i <= playersAmt; i++) {
        result[i] = result[i] * 100.0 / sum;
    }
    return result;
}

function calculatePrizes(ratios, remainingPrizepool, rounding) {
    let result = Array(ratios.length).fill(0.0);

    for (let i = 1; i < result.length; i++) {
        result[i] = remainingPrizepool * ratios[i] / 100.0;
        // - rounding / 6  - round 0.66 down, otherwise - up
        result[i] = Math.round(((result[i] - rounding / 3) / rounding)) * rounding;
    }
    let sum = result.reduce((acc, val) => acc + val, 0);
    result[1] += remainingPrizepool - sum;

    return result;
}
