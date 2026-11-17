// Every eclipse visible from Prince Albert (at least partly above the horizon) through 2075, computed once with
// astronomy-engine. Penumbral lunar eclipses are left out: the eye can't tell them from an ordinary full moon.
// Each row: the eclipsed body, peak (UTC), half the partial phase in minutes, then the closest gap between the body's
// centre and its shadow's (the moon for the sun, Earth's umbra for the moon) and the shadow's radius, both in the body's
// radii, and which side the shadow passes on (-1 above, 1 below).
const ECLIPSES = [
  ['moon', '2028-01-12T04:13Z', 29.1, 3.557, 2.7, 1],
  ['moon', '2028-12-31T16:51Z', 104.7, 1.196, 2.7, 1],
  ['sun', '2029-01-14T17:07Z', 84.3, 0.268, 0.947, -1],
  ['moon', '2029-06-26T03:22Z', 110.1, 0, 2.7, 1],
  ['moon', '2029-12-20T22:41Z', 107, 1.459, 2.7, -1],
  ['sun', '2033-03-30T18:06Z', 65.9, 0.824, 1.055, -1],
  ['moon', '2033-10-08T10:55Z', 101.5, 0.965, 2.7, -1],
  ['moon', '2034-09-28T02:46Z', 15.5, 3.661, 2.7, -1],
  ['moon', '2036-08-07T02:51Z', 116, 0.809, 2.7, 1],
  ['sun', '2036-08-21T16:30Z', 14.6, 2.023, 1.067, -1],
  ['moon', '2037-01-31T14:00Z', 99, 1.267, 2.7, 1],
  ['moon', '2037-07-27T04:08Z', 96.6, 2.071, 2.7, -1],
  ['sun', '2039-06-21T16:29Z', 76.6, 0.884, 0.949, -1],
  ['moon', '2040-05-26T11:44Z', 105.7, 0.55, 2.7, -1],
  ['sun', '2040-11-04T18:27Z', 69.3, 0.972, 0.987, -1],
  ['moon', '2041-11-08T04:33Z', 45.9, 3.35, 2.7, 1],
  ['moon', '2042-09-29T10:44Z', 5.1, 3.696, 2.7, -1],
  ['moon', '2043-03-25T14:30Z', 107.7, 1.464, 2.7, 1],
  ['sun', '2043-04-09T19:29Z', 45.6, 1.59, 1.055, -1],
  ['moon', '2043-09-19T01:50Z', 103.3, 1.169, 2.7, -1],
  ['sun', '2044-08-23T01:34Z', 53.7, 0.064, 1.034, 1],
  ['moon', '2044-09-07T11:19Z', 103.4, 1.6, 2.7, 1],
  ['sun', '2045-08-12T16:38Z', 60.8, 0.918, 1.072, 1],
  ['moon', '2046-01-22T13:01Z', 26.5, 3.583, 2.7, 1],
  ['sun', '2046-02-06T00:48Z', 66.7, 0.365, 0.908, 1],
  ['moon', '2047-01-12T01:24Z', 104.8, 1.221, 2.7, 1],
  ['moon', '2047-07-07T10:34Z', 109.6, 0, 2.7, -1],
  ['moon', '2048-01-01T06:52Z', 107.5, 1.438, 2.7, -1],
  ['sun', '2048-06-11T11:48Z', 59.2, 0.49, 0.936, 1],
  ['moon', '2050-10-30T03:20Z', 96.8, 1.58, 2.7, 1],
  ['moon', '2051-04-26T02:14Z', 110.8, 1.293, 2.7, 1],
  ['sun', '2052-03-30T18:55Z', 48.9, 1.545, 1.042, 1],
  ['moon', '2052-10-08T10:44Z', 32.6, 3.526, 2.7, -1],
  ['moon', '2054-02-22T06:49Z', 100.8, 1.121, 2.7, -1],
  ['moon', '2054-08-18T09:24Z', 113.6, 1.09, 2.7, 1],
  ['sun', '2054-09-02T01:42Z', 51.3, 0.319, 1.054, -1],
  ['sun', '2055-01-27T17:41Z', 86.2, 0.67, 0.921, -1],
  ['moon', '2055-02-11T22:44Z', 99.5, 1.233, 2.7, 1],
  ['moon', '2055-08-07T10:51Z', 102.1, 1.771, 2.7, -1],
  ['sun', '2056-01-16T23:27Z', 52.3, 1.3, 0.961, 1],
  ['moon', '2057-06-17T02:24Z', 85, 2.177, 2.7, 1],
  ['sun', '2057-07-02T00:51Z', 67.7, 0.139, 0.943, -1],
  ['moon', '2057-12-11T00:51Z', 102.4, 1.853, 2.7, -1],
  ['moon', '2058-11-30T03:14Z', 110.7, 0.852, 2.7, 1],
  ['moon', '2059-05-27T07:53Z', 49.3, 3.323, 2.7, -1],
  ['moon', '2059-11-19T12:59Z', 50.3, 3.274, 2.7, 1],
  ['moon', '2061-09-29T09:36Z', 101.6, 1.36, 2.7, -1],
  ['moon', '2062-03-25T03:31Z', 106, 1.149, 2.7, -1],
  ['moon', '2064-07-28T07:50Z', 38.9, 3.481, 2.7, -1],
  ['moon', '2065-01-22T09:56Z', 104.8, 1.244, 2.7, 1],
  ['moon', '2066-01-11T15:02Z', 107.9, 1.419, 2.7, -1],
  ['sun', '2066-06-22T19:24Z', 87.3, 0.822, 0.947, -1],
  ['moon', '2066-07-07T09:28Z', 86, 2.138, 2.7, 1],
  ['moon', '2068-05-17T05:40Z', 99.9, 1.781, 2.7, -1],
  ['moon', '2068-11-09T11:44Z', 95.4, 1.659, 2.7, 1],
  ['sun', '2068-11-24T22:13Z', 79, 0.381, 0.936, -1],
  ['moon', '2069-05-06T09:07Z', 113.4, 1.059, 2.7, 1],
  ['moon', '2069-10-30T03:32Z', 103.1, 0.723, 2.7, -1],
  ['sun', '2071-09-23T16:08Z', 50.3, 1.423, 1.025, 1],
  ['moon', '2073-02-22T07:22Z', 100.2, 1.179, 2.7, 1],
  ['moon', '2075-06-28T09:53Z', 78.9, 2.444, 2.7, 1],
  ['moon', '2075-12-22T08:53Z', 101.7, 1.887, 2.7, -1],
];

// Where the shadow sits on the body right now, in body radii from its centre; null outside every eclipse.
// The moon drifts east across the sky (leftward in the scene) a little faster than the sun, so it crosses the sun
// from right to left, while Earth's shadow crosses the moon from left to right.
export function eclipseAt(date = new Date()) {
  for (const [body, peak, half, gap, shadow, side] of ECLIPSES) {
    const minutes = (date - Date.parse(peak)) / 60_000;
    if (Math.abs(minutes) >= half) continue;
    // At the partial phase's ends the centres are exactly `1 + shadow` apart; the shadow crosses at a steady speed.
    const speed = Math.sqrt((1 + shadow) ** 2 - gap ** 2) / half;
    const along = minutes * speed * (body === 'sun' ? -1 : 1);
    return { body, along, across: gap * side, shadow };
  }
  return null;
}
