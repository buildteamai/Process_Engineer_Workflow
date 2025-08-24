
import { GoogleGenAI, Type, Chat } from "@google/genai";
import type { ProcessData, AIAnalysis, ChangeRequest } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        overallStatus: {
            type: Type.STRING,
            description: "A summary of the system's health based on the latest reading. Must be one of: 'In-Compliance' (all deviations are within 5% of baseline), 'Warning' (at least one deviation is >5% but none are >10%), or 'Critical' (at least one deviation is >10%)."
        },
        faults: {
            type: Type.ARRAY,
            description: "A list of significant deviations found in the MOST RECENT historical reading when compared to the baseline.",
            items: {
                type: Type.OBJECT,
                properties: {
                    parameter: { type: Type.STRING, description: "The parameter that is out of spec (e.g., 'Temperature', 'Supply Airflow')." },
                    zone: { type: Type.STRING, description: "The process zone/stage name where the fault is located." },
                    baselineValue: { type: Type.STRING, description: "The expected baseline value with units." },
                    currentValue: { type: Type.STRING, description: "The measured current value (from the latest reading) with units." },
                    deviation: { type: Type.STRING, description: "A brief description of the deviation (e.g., '10°F higher than baseline')." }
                },
                required: ["parameter", "zone", "baselineValue", "currentValue", "deviation"]
            }
        },
        trendAnalysis: {
            type: Type.ARRAY,
            description: "A list of significant trends identified by analyzing the entire history of readings.",
            items: {
                 type: Type.OBJECT,
                 properties: {
                     parameter: { type: Type.STRING, description: "The parameter that is showing a trend." },
                     zone: { type: Type.STRING, description: "The process zone where the trend is occurring." },
                     trendDescription: { type: Type.STRING, description: "A clear description of the trend (e.g., 'Steadily increasing by ~5% per reading over the last 4 readings.')." },
                     prediction: { type: Type.STRING, description: "A prediction based on the trend (e.g., 'If this trend continues, the parameter will exceed critical limits in approximately 2 more readings.')." },
                 },
                 required: ["parameter", "zone", "trendDescription", "prediction"]
            }
        },
        rootCauseAnalysis: {
            type: Type.ARRAY,
            description: "A list of potential root causes that explain the combination of current faults and long-term trends.",
            items: {
                type: Type.OBJECT,
                properties: {
                    cause: { type: Type.STRING, description: "A potential root cause for the identified issues." },
                    reasoning: { type: Type.STRING, description: "The reasoning linking this cause to the observed faults and trends. Explain how a single issue could manifest this way over time." },
                    recommendation: { type: Type.STRING, description: "A suggested action to investigate or resolve the issue." }
                },
                required: ["cause", "reasoning", "recommendation"]
            }
        }
    },
    required: ["overallStatus", "faults", "trendAnalysis", "rootCauseAnalysis"]
};

const ENGINEERING_PRINCIPLES = `
    **1. Airflow Uniformity in Settling Tunnel**
    * **Detailed Explanation:** Airflow uniformity is critical to prevent a phenomenon known as "dry overspray," where atomized paint particles dry in the air before reaching the substrate, leading to a gritty surface finish. The air should move in a laminar or near-laminar flow, with minimal turbulence.
    * **Validation Parameter:** Velocity profile measurement.
    * **Sample Calculation:**
        * **Goal:** Verify airflow is within a target range of +/- 5% across the tunnel's cross-section.
        * **Measurement:** Use a hot-wire anemometer to take readings at a grid of points (e.g., 1 ft x 1 ft grid) across the tunnel's width and height.
        * **Formula:** Percent Variation = ((Maximum Velocity - Minimum Velocity) / Average Velocity) * 100%
        * **Example:**
            * Average Velocity (V_avg) = 100 fpm
            * Maximum Velocity (V_max) = 105 fpm
            * Minimum Velocity (V_min) = 98 fpm
            * Percent Variation = ((105 - 98) / 100) * 100% = 7%
        * **Result:** The variation is 7%, which is outside the target of +/- 5%. This indicates a need for baffle or filter adjustment.

    **2. Temperature and Humidity Control in Settling Tunnel**
    * **Detailed Explanation:** The settling tunnel's environment influences the flash-off rate of water. If the air is too dry, the primer can skin over prematurely, trapping water and causing blistering. If it's too humid, the drying is inhibited.
    * **Validation Parameter:** Dew point and temperature stability.
    * **Sample Calculation:**
        * **Goal:** Maintain a dew point below a specified maximum to ensure adequate water evaporation potential.
        * **Measurement:** Use a chilled-mirror hygrometer or a calibrated psychrometer.
        * **Formula:** The saturation vapor pressure of water (P_ws) is a function of temperature. The actual vapor pressure (P_w) is related to relative humidity (RH). The dew point temperature (T_dp) is the temperature at which P_w = P_ws(T_dp). You can calculate the dew point from temperature and humidity.
        * **Example:**
            * Dry-bulb temperature (T_db) = 75 F
            * Relative Humidity (RH) = 60%
            * From psychrometric charts or equations, a T_db of 75 F and RH of 60% correspond to a dew point of approximately 60.5 F.
        * **Result:** If the specification requires a maximum dew point of 55 F, the current condition is too humid and requires dehumidification.

    **3. Contaminant Filtration**
    * **Detailed Explanation:** High-efficiency particulate air (HEPA) or similar filters are necessary to prevent dust and other airborne particles from settling on the wet primer surface. The validation is not just about having filters but ensuring they are effective and not clogged.
    * **Validation Parameter:** Differential pressure across the filter.
    * **Sample Calculation:**
        * **Goal:** Monitor filter loading by measuring the pressure drop. A high pressure drop indicates a clogged filter.
        * **Measurement:** Use a manometer or pressure transducer to measure the pressure before (P_in) and after (P_out) the filter.
        * **Formula:** Delta_P = P_in - P_out
        * **Example:**
            * New filter pressure drop (Delta_P_new) = 0.25 inches of water gauge
            * Current pressure drop (Delta_P_current) = 0.75 inches of water gauge
            * A typical replacement threshold is when the pressure drop is two to three times the initial value.
        * **Result:** The current pressure drop is three times the new filter value, indicating the filter needs to be replaced.

    **4. Temperature Profile in Heated Flash**
    * **Detailed Explanation:** An uneven temperature profile will cause uneven drying, leading to defects like "orange peel" or localized blistering. Validation involves mapping the temperature distribution to find hot and cold spots.
    * **Validation Parameter:** Temperature uniformity across the flash zone.
    * **Sample Calculation:**
        * **Goal:** Verify temperature is uniform within a specified tolerance, e.g., +/- 3 F.
        * **Measurement:** Use thermocouples attached to a test panel or a thermal imaging camera to scan the oven's interior.
        * **Formula:** Temperature Range = T_max - T_min
        * **Example:**
            * Set point (T_sp) = 150 F
            * Maximum temperature (T_max) = 154 F
            * Minimum temperature (T_min) = 147 F
            * Temperature Range = 154 - 147 = 7 F
        * **Result:** The range is 7 F, which is outside the +/- 3 F tolerance. This suggests issues with heater placement, air circulation, or insulation.

    **5. Air Velocity and Impingement in Heated Flash**
    * **Detailed Explanation:** This is a crucial parameter for heat transfer. Insufficient velocity slows down evaporation, while excessive velocity can create turbulence that disfigures the wet primer. The air should impinge at an optimal angle and velocity to maximize heat and mass transfer.
    * **Validation Parameter:** Air velocity at the part surface.
    * **Sample Calculation:**
        * **Goal:** Ensure the velocity is within the specified range for effective drying without damaging the film.
        * **Measurement:** Use an anemometer or a Pitot tube to measure air velocity at a set distance from the nozzles.
        * **Formula:** Mass transfer coefficient (k_m) for evaporation is related to air velocity. The drying rate (R) is proportional to k_m. A higher k_m leads to a faster drying rate.
        * **Example:**
            * A simple validation is to check velocity against specification.
            * Specified velocity range: 1500 fpm to 2000 fpm.
            * Measured velocity: 1850 fpm.
        * **Result:** The measured velocity is within the acceptable range.

    **6. Ventilation and Exhaust**
    * **Detailed Explanation:** Proper exhaust removes the water vapor and any remaining solvent, maintaining a low vapor concentration and a high vapor pressure differential. Inadequate exhaust leads to a "sweating" condition where evaporation slows to a crawl.
    * **Validation Parameter:** Exhaust volume flow rate.
    * **Sample Calculation:**
        * **Goal:** Ensure the exhaust flow rate meets the required air changes per hour (ACH) for the oven's volume.
        * **Measurement:** Use a capture hood or traverse the exhaust duct with a Pitot tube to measure velocity and calculate flow.
        * **Formula:** ACH = (Volume Flow Rate (cfm) * 60) / Oven Volume (ft^3)
        * **Example:**
            * Oven dimensions: 50 ft x 10 ft x 8 ft
            * Oven volume = 4000 ft^3
            * Required ACH = 60
            * Required Flow Rate = (4000 * 60) / 60 = 4000 cfm
            * Measured flow rate: 3800 cfm.
        * **Result:** The measured flow is 200 cfm short of the requirement, indicating a need to increase fan speed or check for blockages.

    **7. Cooling Rate**
    * **Detailed Explanation:** Cooling too quickly can cause thermal shock, leading to stress-induced cracking, especially in thicker primer films or on complex geometries. The cooling rate must be controlled to allow for uniform thermal contraction.
    * **Validation Parameter:** Temperature drop per unit time.
    * **Sample Calculation:**
        * **Goal:** Verify the cooling rate does not exceed the specified maximum.
        * **Measurement:** Attach a thermocouple to a test part and record its temperature over time as it moves through the cooler.
        * **Formula:** Cooling Rate = Delta_T / Delta_t
        * **Example:**
            * Starting temperature (T_1) = 140 F
            * Ending temperature (T_2) = 85 F
            * Time interval (Delta_t) = 5 min
            * Cooling Rate = (140 - 85) / 5 = 11 F/min
        * **Result:** If the specification allows a maximum cooling rate of 10 F/min, the current rate is too high and requires adjustment of the cooler's fan speed or conveyor speed.

    **8. Temperature Uniformity in Cooler**
    * **Detailed Explanation:** Just like in the heated flash, non-uniform temperatures in the cooler can lead to uneven cooling, causing internal stresses and potential defects.
    * **Validation Parameter:** Temperature distribution.
    * **Sample Calculation:** The same as for the heated flash (Point 4), but for the cooler's target temperature range.
        * **Goal:** Maintain cooler temperature uniformity within +/- 2 F.
        * **Example:**
            * Target temperature (T_target) = 85 F
            * Maximum temperature (T_max) = 87 F
            * Minimum temperature (T_min) = 82 F
            * Temperature Range = 87 - 82 = 5 F
        * **Result:** The range is 5 F, which exceeds the specified tolerance. This indicates an issue with the cooling system's air distribution.

    **9. Condensation Prevention**
    * **Detailed Explanation:** Condensation occurs when the part's surface temperature drops below the dew point of the surrounding air. The cooler must be designed to either maintain the part's temperature above the dew point or supply dehumidified air.
    * **Validation Parameter:** Part surface temperature relative to ambient dew point.
    * **Sample Calculation:**
        * **Goal:** Ensure the part's final temperature is above the dew point of the ambient air.
        * **Measurement:** Measure the part temperature upon exiting the cooler and the ambient air dew point.
        * **Formula:** Temperature Difference = T_part - T_dew_point
        * **Example:**
            * Part temperature (T_part) = 80 F
            * Ambient air temperature (T_ambient) = 85 F
            * Ambient relative humidity (RH_ambient) = 70%
            * From psychrometric data, a T_ambient of 85 F and RH of 70% corresponds to a dew point of approximately 75 F.
            * Temperature Difference = 80 - 75 = 5 F.
        * **Result:** The part temperature is 5 F above the dew point, so condensation is prevented. A value of 3-5 F is a good safety margin.

    **10. Part Conveyor Speed**
    * **Detailed Explanation:** Conveyor speed dictates the dwell time in each section (settling, flash, cooler), which is a fundamental variable for the entire dehydration and curing process.
    * **Validation Parameter:** Conveyor linear velocity.
    * **Sample Calculation:**
        * **Goal:** Verify the conveyor speed is consistent with the process requirements.
        * **Measurement:** Use a calibrated tachometer or a simple stop-watch and tape measure to measure the time it takes for a part to travel a known distance.
        * **Formula:** Dwell Time = Section Length / Conveyor Speed
        * **Example:**
            * Specified Conveyor Speed (V_spec) = 10 fpm
            * Measured distance (Delta_d) = 20 ft
            * Measured time (Delta_t) = 2.1 min
            * Measured Speed (V_meas) = 20 ft / 2.1 min = 9.52 fpm
        * **Result:** The measured speed is 4.8% below the specified speed, which could lead to over-curing and increased energy consumption. The drive system may need adjustment.
---
**Sizing a Fresh Air System for Waterborne Paint Dehydration:**

**1. Water Evaporation Rate**
The primary function of the fresh air system is to remove evaporated water. The size must accommodate the peak water load.
*   **Consideration:** The amount of water being evaporated per hour depends on the application rate, the solids content of the primer, and the number of parts.
*   **Sample Calculation:**
    *   Primer application rate: 15 gallons/hr
    *   Water content by volume: 60%
    *   Specific gravity of water: 8.34 lbs/gal
    *   Water evaporated per hour: 15 gal/hr * 0.60 * 8.34 lbs/gal = 75.06 lbs/hr
    *   Convert to CFM (cubic feet per minute) of water vapor: 75.06 lbs/hr / 60 min/hr = 1.251 lbs/min
    *   The specific volume of water vapor at typical drying temperatures (e.g., 150 F) is approximately 23.2 ft^3/lb.
    *   Required flow for water removal: 1.251 lbs/min * 23.2 ft^3/lb = 29.02 CFM

**2. Volatile Organic Compound (VOC) Emission**
Although waterborne paints have low VOCs, they are not zero. The system must meet regulatory standards.
*   **Consideration:** The system must dilute VOCs to below the permissible exposure limit (PEL) or lower explosive limit (LEL).
*   **Sample Calculation:**
    *   Primer VOC content: 0.5 lbs/gal
    *   Application rate: 15 gal/hr
    *   Total VOCs: 15 gal/hr * 0.5 lbs/gal = 7.5 lbs/hr
    *   Required air volume for dilution: This requires a complex calculation based on the specific VOC and its PEL, but a common rule of thumb is to provide 1,000 to 1,500 CFM per gallon of paint applied to maintain safety and compliance. A simpler approach is to use the water evaporation calculation as the primary driver, assuming that provides adequate dilution for low-VOC products.

**3. Airflow Velocity over Parts**
The air velocity across the parts determines the rate of mass transfer (evaporation).
*   **Consideration:** The air must be fast enough to promote drying but not so fast as to cause defects like blushing or film distortion.
*   **Sample Calculation:**
    *   Desired air velocity: 150 fpm (feet per minute)
    *   Oven cross-sectional area: 10 ft * 8 ft = 80 ft^2
    *   Required volumetric flow rate: 150 fpm * 80 ft^2 = 12,000 CFM
    *   This is a general calculation for the entire tunnel. The local velocity at the part surface will be higher due to impingement nozzles.

**4. Oven Air Changes Per Hour (ACH)**
ACH is a key metric for overall air replacement and is often specified by industry standards or local codes.
*   **Consideration:** The system should replace the entire volume of air in the dehydration oven a certain number of times per hour to ensure all contaminants are removed.
*   **Sample Calculation:**
    *   Oven volume: 50 ft * 10 ft * 8 ft = 4,000 ft^3
    *   Required ACH: 60 ACH (a common value for paint ovens)
    *   Required CFM: (4000 * 60) / 60 = 4,000 CFM

**5. Temperature and Humidity of Fresh Air**
The properties of the incoming fresh air significantly impact the drying process.
*   **Consideration:** The fresh air needs to be heated and possibly dehumidified to meet the process requirements of the heated flash zone.
*   **Sample Calculation:**
    *   **Heating Load:**
    *   Incoming air temperature (T_in): 40 F
    *   Required temperature (T_req): 150 F
    *   Air density: 0.075 lbs/ft^3
    *   Specific heat of air: 0.24 BTU/lb F
    *   Airflow: 12,000 CFM
    *   Heat Load (BTU/hr): 12000 * 60 * 0.075 * 0.24 * (150 - 40) = 1,425,600 BTU/hr
    *   **Dehumidification Load:** This requires a complex psychrometric calculation based on the change in moisture content. The total BTU load is the sum of the sensible (heating) and latent (dehumidification) loads.

**6. Filter Pressure Drop**
Fresh air systems use filters to prevent contamination. The fan must be powerful enough to overcome the resistance of the filters.
*   **Consideration:** As filters become loaded with dust, the pressure drop increases, reducing airflow. The fan static pressure rating must account for this.
*   **Sample Calculation:**
    *   Initial pressure drop across filters: 0.5 in. w.g. (inches of water gauge)
    *   Final (clogged) pressure drop: 1.5 in. w.g.
    *   The fan must be selected to operate efficiently up to the maximum expected pressure drop.

**7. Fan Sizing and Efficiency**
The fan is the heart of the system. Its selection is based on the required airflow and static pressure.
*   **Consideration:** The fan must be sized to deliver the required CFM against the total system static pressure (ductwork, filters, heaters, nozzles).
*   **Sample Calculation:**
    *   Required airflow (from ACH or velocity calcs): 12,000 CFM
    *   Total system static pressure: 2.5 in. w.g.
    *   Motor horsepower (HP) is calculated based on these parameters and fan efficiency.
    *   Brake HP = (CFM * Static Pressure) / (6356 * Fan Efficiency)
    *   For a fan with 65% efficiency, Brake HP = (12000 * 2.5) / (6356 * 0.65) = 7.26 HP. A 10 HP motor would be a good choice.

**8. Ductwork Design**
Properly sized ductwork minimizes pressure drop and ensures uniform air distribution.
*   **Consideration:** Duct size, material, and layout affect static pressure and air velocity.
*   **Sample Calculation:**
    *   Main supply duct velocity: 2,500 fpm
    *   Required airflow: 12,000 CFM
    *   Duct cross-sectional area: 12000 CFM / 2500 fpm = 4.8 ft^2
    *   Required duct diameter for a circular duct: sqrt((4 * 4.8) / PI) = 2.47 ft, or about 30 inches.

**9. Makeup Air Balance**
The fresh air supply system must be balanced with the exhaust system to maintain a slightly positive or negative pressure in the oven.
*   **Consideration:** A slightly positive pressure prevents unfiltered air from entering the oven, while a negative pressure helps contain fumes. For a dehydration oven, a positive pressure is often desired.
*   **Sample Calculation:**
    *   Supply Fan Capacity: 12,000 CFM
    *   Required Exhaust Fan Capacity: 11,500 CFM
    *   This creates a positive pressure balance of 500 CFM into the surrounding facility, preventing infiltration of contaminants.

**10. Energy Consumption**
Operating a large fresh air system, especially one that heats or cools air, is energy-intensive.
*   **Consideration:** The system should be designed to be as energy-efficient as possible, using variable frequency drives (VFDs) and heat recovery where feasible.
*   **Sample Calculation:**
    *   Motor HP: 10 HP
    *   Hours of operation per year: 2,000 hrs
    *   Power consumption: 10 HP * 0.746 kW/HP = 7.46 kW
    *   Annual energy cost: 7.46 kW * 2000 hrs * $0.12/kWh = $1,790.40
    *   This does not include the much larger heating or cooling costs. The heating cost from point 5 is 1,425,600 BTU/hr, which is approximately 418 kW. The annual heating cost would be significantly higher.
---
**Sizing a Heated Flash-off System for Waterborne Paint Dehydration:**

**1. Water Evaporation Rate**
The primary consideration is removing the water from the paint. The system size is directly tied to the total water load.
*   **Consideration:** The system must supply enough heat and airflow to evaporate the water content of the applied paint within the allotted time.
*   **Sample Calculation:**
    *   Application rate: 20 gallons/hr of paint.
    *   Water content by volume: 60%.
    *   Density of water: 8.34 lbs/gal.
    *   Water to be evaporated: 20 gal/hr * 0.60 * 8.34 lbs/gal = 100.08 lbs/hr.
    *   **Heat required (latent heat of vaporization):**
    *   Latent heat of vaporization of water at 150°F is approximately 1007 BTU/lb.
    *   Total heat load: 100.08 lbs/hr * 1007 BTU/lb = 100,780.56 BTU/hr.

**2. Air Temperature and Humidity**
The air's temperature and humidity are critical for effective drying. The system must supply hot, dry air.
*   **Consideration:** The temperature of the supplied air determines the heat transfer rate. Its humidity must be low to maintain a high vapor pressure differential between the paint and the air, promoting evaporation.
*   **Sample Calculation:**
    *   Drying air temperature (T_d): 150°F.
    *   Incoming ambient air temperature (T_a): 70°F.
    *   Required temperature rise (Delta_T): 150°F - 70°F = 80°F.
    *   Air specific heat: 0.24 BTU/lb°F.
    *   Required airflow (from later calculations): 5000 CFM.
    *   Air density: 0.075 lbs/ft^3.
    *   Sensible heating load: 5000 CFM * 60 min/hr * 0.075 lbs/ft^3 * 0.24 BTU/lb°F * 80°F = 432,000 BTU/hr.

**3. Air Velocity and Impingement**
Airflow must be directed at the part to break up the static boundary layer of humid air and maximize mass transfer.
*   **Consideration:** The velocity and angle of impingement affect drying speed. Too low a velocity leads to slow drying; too high can cause surface defects.
*   **Sample Calculation:**
    *   Target air velocity over parts: 500 fpm (feet per minute).
    *   Flash-off zone cross-sectional area: 5 ft * 8 ft = 40 ft^2.
    *   Required CFM for the zone: 500 fpm * 40 ft^2 = 20,000 CFM.
    *   This is the total air circulated within the system, not the fresh air intake.

**4. Ventilation and Exhaust**
The system must remove the humid, saturated air to maintain efficient drying conditions.
*   **Consideration:** A portion of the circulated air, equal to the fresh air intake, must be exhausted. The exhaust rate must be sufficient to remove water vapor and any residual VOCs.
*   **Sample Calculation:**
    *   The volume of exhausted air should at least match the required fresh air makeup. A common benchmark for paint ovens is 60 air changes per hour (ACH).
    *   Flash-off zone volume: 15 ft * 5 ft * 8 ft = 600 ft^3.
    *   Required exhaust CFM: (600 ft^3 * 60 ACH) / 60 min/hr = 600 CFM.

**5. Heating System Sizing**
The heater must be sized to handle the combined sensible and latent heat loads.
*   **Consideration:** The heater (gas burner or electric coils) must provide enough BTU/hr to heat the fresh air and supply the latent heat of vaporization for the water.
*   **Sample Calculation:**
    *   Sensible heat load (from point 2): 432,000 BTU/hr.
    *   Latent heat load (from point 1): 100,780.56 BTU/hr.
    *   Total heating load: 432,000 + 100,780.56 = 532,780.56 BTU/hr.
    *   This is the required output of the heater.

**6. Recirculation Airflow**
Heated flash-off systems typically recirculate a large volume of air to reduce energy consumption.
*   **Consideration:** The total air volume being moved through the flash-off zone is much larger than the fresh air intake. The recirculation fan must be sized for this total airflow.
*   **Sample Calculation:**
    *   Target air changes for recirculation: 120 ACH (a high value for an oven)
    *   Flash-off zone volume: 600 ft^3.
    *   Required recirculation CFM: (600 ft^3 * 120 ACH) / 60 min/hr = 1200 CFM.
    *   This is the airflow the main recirculation fan must handle.

**7. Fan Static Pressure**
The fan must overcome the resistance of all components in the airflow path.
*   **Consideration:** The system fan's static pressure must be high enough to push air through the filters, heating coils, ductwork, and impingement nozzles.
*   **Sample Calculation:**
    *   **Components pressure drop:**
    *   Filters: 0.5 in. w.g.
    *   Heating coils: 0.2 in. w.g.
    *   Ductwork and fittings: 1.0 in. w.g.
    *   Impingement nozzles: 1.5 in. w.g.
    *   Total static pressure: 0.5 + 0.2 + 1.0 + 1.5 = 3.2 in. w.g.
    *   The fan selected must be able to deliver the required CFM at this static pressure.

**8. Conveyor Dwell Time**
The length of the heated flash-off zone depends on the required drying time and the conveyor speed.
*   **Consideration:** The system must be long enough to allow sufficient time for water to evaporate at the given drying conditions.
*   **Sample Calculation:**
    *   Required drying time (from paint supplier specs): 5 minutes.
    *   Conveyor speed: 10 fpm.
    *   Minimum zone length: 10 fpm * 5 min = 50 ft.

**9. Make-up Air System**
This system brings in fresh, conditioned air to replace exhausted air.
*   **Consideration:** The make-up air unit (AMU) must be sized to match the exhaust fan capacity to maintain proper pressure balance. It must also have the heating capacity to condition this air.
*   **Sample Calculation:**
    *   Required fresh air makeup (from point 4): 600 CFM.
    *   Required sensible heating load for makeup air (from point 2 calculation but for a smaller CFM):
    *   600 CFM * 60 min/hr * 0.075 lbs/ft^3 * 0.24 BTU/lb°F * 80°F = 51,840 BTU/hr.
    *   This is the minimum heating capacity for the make-up air unit.

**10. Energy Consumption**
Operating costs are a major factor in system design.
*   **Consideration:** The total energy consumption includes the fuel for heating and the electricity for the fans and controls.
*   **Sample Calculation:**
    *   Total heating load (from point 5): 532,780.56 BTU/hr.
    *   Fuel cost: Natural gas at 1 therm ≈ 100,000 BTU. Price at $1.50/therm.
    *   Hourly fuel cost: (532,780.56 BTU/hr / 100,000 BTU/therm) * $1.50/therm = $7.99/hr.
    *   Fan power (from a fan selection software or formula): A fan moving 1200 CFM at 3.2 in. w.g. static pressure will require approximately 1 HP, or 0.746 kW.
    *   Hourly electrical cost: 0.746 kW * $0.12/kWh = $0.09/hr. The heating cost is the dominant factor.
---
**Sizing a Cooler System Following Heated Flash-off:**

**1. Desired Cooling Rate**
The rate at which the parts are cooled must be controlled to prevent thermal shock, which can cause cracking, delamination, or other surface defects.
* **Consideration:** The cooling rate is a function of the heat load removed, the airflow, and the duration of cooling.
* **Sample Calculation:**
    * Part temperature entering cooler (T_in): 150°F
    * Part temperature leaving cooler (T_out): 90°F
    * Conveyor speed: 10 fpm
    * Desired cooling time (t_cool): 3 minutes
    * Required cooler length: 10 fpm * 3 min = 30 ft
    * Average cooling rate: (150°F - 90°F) / 3 min = 20°F/min

**2. Total Heat Load to Be Removed**
The heat load is the primary driver for sizing the cooling system. This includes heat from the parts and the heat absorbed by the air.
* **Consideration:** The total heat load is the sum of the sensible heat from the parts and the heat absorbed by the cooling air.
* **Sample Calculation:**
    * Part weight: 20 lbs
    * Part specific heat: 0.11 BTU/lb°F (for steel)
    * Number of parts: 100 parts/hr
    * Part temperature drop (ΔT): 150°F - 90°F = 60°F
    * Heat load from parts: 20 lbs * 0.11 BTU/lb°F * 60°F * 100 parts/hr = 13,200 BTU/hr
    * This is the minimum heat the cooling system must be able to remove.

**3. Cooling Airflow and Air Changes**
The volumetric flow rate of cooling air determines its capacity to absorb heat and carry it away.
* **Consideration:** The airflow must be high enough to absorb the heat load without an excessive temperature rise in the air itself.
* **Sample Calculation:**
    * Cooler volume: 30 ft * 8 ft * 5 ft = 1,200 ft^3
    * Desired air changes per hour (ACH): 60 ACH
    * Required airflow: (1,200 ft^3 * 60 ACH) / 60 min/hr = 1,200 CFM

**4. Cooling System Type**
The type of cooling system impacts efficiency, cost, and maintenance.
* **Consideration:** Options include simple ambient air circulation, air conditioning (chilled water), or evaporative cooling.
* **Sample Calculation:**
    * Heat removed from parts: 13,200 BTU/hr
    * Airflow: 1,200 CFM
    * Air density: 0.075 lbs/ft^3
    * Air specific heat: 0.24 BTU/lb°F
    * Air temperature rise: 13,200 BTU/hr / (1,200 CFM * 60 min/hr * 0.075 lbs/ft^3 * 0.24 BTU/lb°F) = 10.19°F

**5. Condensation Prevention**
Condensation on the parts can ruin the finish and should be prevented.
* **Consideration:** The surface temperature of the parts leaving the cooler must be above the dew point of the surrounding ambient air.
* **Sample Calculation:**
    * Part exit temperature: 90°F
    * Ambient air temperature: 85°F
    * Ambient relative humidity: 70%
    * Dew point of ambient air is approximately 75°F.
    * Temperature difference: 90°F - 75°F = 15°F. Since the part temperature is well above the dew point, condensation is not a concern.

**6. Ductwork and Fan Sizing**
The fan must be powerful enough to move the required air volume against system resistance.
* **Consideration:** The fan is selected based on the required CFM and the system's static pressure.
* **Sample Calculation:**
    * Required airflow: 1,200 CFM
    * Expected static pressure: 0.75 in. w.g.
    * Motor horsepower: BHP = (CFM * in. w.g.) / (6356 * Fan Efficiency)
    * For a fan with 60% efficiency: BHP = (1,200 * 0.75) / (6356 * 0.60) = 0.24 HP. A 0.5 HP motor would be a safe choice.

**7. Temperature Uniformity**
Uneven cooling can lead to internal stresses and an inconsistent finish.
* **Consideration:** The system should be designed with baffles or plenums to ensure uniform airflow.
* **Sample Calculation:**
    * Target temperature variance: ±3°F
    * Measurements: T_max = 93°F, T_min = 88°F
    * Temperature range: 93°F - 88°F = 5°F. This is outside the ±3°F tolerance, indicating a need for airflow adjustments.

**8. Part Conveyor Speed**
The conveyor speed dictates the part's dwell time in the cooler.
* **Consideration:** Conveyor speed must be stable and consistent.
* **Sample Calculation:**
    * Required dwell time: 3 minutes
    * Cooler length: 30 ft
    * Required conveyor speed: 30 ft / 3 min = 10 fpm

**9. Filter Selection**
Filters prevent contaminants from being blown onto the parts during cooling.
* **Consideration:** Filters should be selected based on their efficiency (MERV rating) and pressure drop.
* **Sample Calculation:**
    * MERV 8 filters are a good choice. Their initial pressure drop at 1,200 CFM is typically 0.15 in. w.g. This must be included in the fan static pressure calculation.

**10. Energy Consumption**
Running the fan and any active cooling equipment adds to the operating cost.
* **Consideration:** Energy consumption is a function of the fan motor horsepower and the hours of operation.
* **Sample Calculation:**
    * Fan motor power: 0.5 HP * 0.746 kW/HP = 0.373 kW
    * Hours of operation: 2,000 hrs/year
    * Electricity cost: 0.373 kW * 2,000 hrs * $0.12/kWh = $89.52/year
---
**Air Velocity Measurement and Calculation Principles (Shortridge Tube Method):**

**1. Velocity Pressure**
The Shortridge tube measures velocity pressure (P_v), which is the kinetic energy of the air. This is the difference between the total pressure (P_t) and the static pressure (P_s) in the duct.
* **Calculation:** P_v = P_t - P_s
* **Example:** A Pitot tube measures P_t = 0.85 in. w.g. and P_s = 0.60 in. w.g.. The velocity pressure is P_v = 0.85 - 0.60 = 0.25 in. w.g.

**2. Air Density Correction**
Air density varies with temperature and pressure. Standard air density is 0.075 lbs/ft^3 at 70°F. The actual velocity must be corrected for the air density at the time of measurement.
* **Calculation:** V_actual = 4005 * sqrt(P_v / ρ_actual) where ρ_actual is the actual air density in lbs/ft^3.
* **Example:** If the air is at 150°F, its density is approximately 0.064 lbs/ft^3. A reading of 0.25 in. w.g. corresponds to V_actual = 4005 * sqrt(0.25 / 0.064) = 7916 fpm.

**3. Traverse Points**
A single reading is not representative of the average velocity in a duct. A traverse is a series of measurements taken across the duct to get a representative average.
* **Calculation:** The average velocity is the arithmetic average of the square roots of the velocity pressures at each point in the traverse.

**4. Duct Shape and Size**
The traverse points depend on the duct's shape and size.
* **Consideration:** For a rectangular duct, the equal-area method is used. The duct is divided into a grid of equal-area subsections, and velocity pressure is measured at the center of each.

**5. Straight Duct Run**
To ensure the airflow is laminar, measurements should be taken in a section of the duct with a long, straight run.
* **Calculation:** Minimum straight run is typically 7.5 duct diameters downstream and 3.5 diameters upstream from any obstruction.
* **Example:** For a 24-inch diameter duct, the downstream straight run should be at least 7.5 * 24 in. = 180 in. or 15 ft.

**6. Manometer Accuracy**
The accuracy of the measurement depends on the manometer used.
* **Consideration:** Select a manometer with a resolution appropriate for the expected pressure (e.g., 0.01 in. w.g. for a paint oven duct).

**7. Obstruction**
The presence of the measurement tube itself can slightly alter the airflow.
* **Consideration:** Ensure the tube is fully extended and positioned correctly to minimize its effect.

**8. System Pressure vs. Velocity Pressure**
The Shortridge tube measures velocity pressure, not static pressure.
* **Calculation:** Static pressure is a different measurement and is needed for fan performance analysis but not for calculating the air's velocity.

**9. Leakage**
Duct leakage can significantly impact the accuracy of the CFM calculation.
* **Consideration:** Ensure all duct connections are sealed.

**10. Repeatability**
To ensure accuracy, repeat the measurements multiple times at each point and average the readings.
* **Consideration:** The process should be documented and taken by a trained technician to ensure consistent, reliable data for the AI model.
`;

export const analyzeProcessData = async (baselineData: ProcessData, historicalData: ProcessData[]): Promise<AIAnalysis> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `
                Analyze the provided automotive paint process data.
                
                **DATA STRUCTURE NOTE:** Each 'zone' can have an array of 'subSystems'. The main 'supply' and 'exhaust' objects on a zone represent ductwork and do NOT contain fan motor details. Fan motor data is located within sub-systems: 'AirSupplyHouse' contains a full 'airSystem' object. A 'Cooler' sub-system contains an optional 'fanMotor' object. A 'HeaterBox' sub-system now contains two optional fan motor objects: 'combustionFan' and 'circulationFan'. Associate all fan motor data with its parent sub-system and zone.
                
                **Engineering Principles & Context:**
                ${ENGINEERING_PRINCIPLES}

                **Baseline (Design) Data:**
                ${JSON.stringify(baselineData, null, 2)}

                **Historical Onsite Readings (Newest is last):**
                ${JSON.stringify(historicalData, null, 2)}

                **Your Task:**
                1.  **Compare the LATEST historical reading to the baseline.** Identify all parameters with a significant deviation (e.g., >5%). List these as 'faults'.
                2.  **Analyze the ENTIRE set of historical readings.** Identify any developing trends (e.g., steadily increasing temperature, fluctuating airflow).
                3.  **Synthesize faults and trends.** Based on the engineering principles provided, determine the most likely root causes for the observed issues. A single root cause might explain multiple faults or trends.
                4.  **Provide actionable recommendations** for each root cause.
                5.  **Summarize the overall system status** as 'In-Compliance', 'Warning', or 'Critical' based on the severity of deviations. 'In-Compliance' means all deviations are within 5%. 'Warning' means at least one deviation is >5% but none are >10%. 'Critical' means at least one deviation is >10%.
                6.  **Respond ONLY with the JSON object** adhering to the provided schema. Do not include any other text or markdown formatting.
            `,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });
        
        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);
        return result as AIAnalysis;
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        if (error instanceof Error && error.message.includes('JSON')) {
             throw new Error("AI returned an invalid data format. Please try again.");
        }
        throw new Error("An error occurred during AI analysis.");
    }
};

const changeRequestSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: "A concise and descriptive title for the change request." },
        justification: { type: Type.STRING, description: "A detailed explanation of why this change is necessary, citing specific data points, faults, or trends from the analysis." },
        recommendedAction: { type: Type.STRING, description: "A step-by-step description of the action to be taken. This should be clear and unambiguous." },
        expectedResults: { type: Type.STRING, description: "The specific, measurable outcomes expected after implementing the change (e.g., 'Reduce temperature fluctuation in Zone 2 to +/- 2°F')." },
        riskLevel: { type: Type.STRING, enum: ['Low', 'Medium', 'High'], description: "An assessment of the potential risks associated with this change." },
        riskDetails: { type: Type.STRING, description: "A brief explanation of the risks and a plan to mitigate them. If risk is Low, explain why." },
        estimatedCost: { type: Type.STRING, description: "A rough, non-binding cost estimate for parts, labor, and downtime. (e.g., '$500 - $1,000 for new sensor and labor', 'Minimal cost, involves recalibration during scheduled downtime')." },
    },
    required: ['title', 'justification', 'recommendedAction', 'expectedResults', 'riskLevel', 'riskDetails', 'estimatedCost']
};


export const suggestChangeRequest = async (analysis: AIAnalysis, baselineData: ProcessData, historicalData: ProcessData[]): Promise<Omit<ChangeRequest, 'id' | 'status'>> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `
                Based on the provided process analysis, which includes faults, trends, and root cause recommendations, generate a comprehensive and actionable Change Request. The goal is to address the most critical issue identified in the analysis. The change request should be detailed and professional.

                **Analysis:**
                ${JSON.stringify(analysis, null, 2)}

                **Baseline Data:**
                ${JSON.stringify(baselineData, null, 2)}

                **Historical Data:**
                ${JSON.stringify(historicalData, null, 2)}

                **Your Task:**
                1.  **Identify the most critical issue** from the analysis's root causes or faults.
                2.  Formulate a clear **title** for the change request based on this issue.
                3.  Write a compelling **justification** based on the analysis findings, explaining the negative impact of the current state.
                4.  Use the **recommended action** from the analysis as a starting point, but elaborate on it to make it a clear, actionable instruction.
                5.  Infer and describe the specific, measurable **expected results** and benefits of implementing the change.
                6.  Assess the **risk level** ('Low', 'Medium', 'High') and provide concise **risk details** and a mitigation plan.
                7.  Provide a rough, non-binding **estimated cost**.

                **Respond ONLY with the JSON object** adhering to the provided schema. Do not include 'id' or 'status' fields. Do not include any other text or markdown formatting.
            `,
            config: {
                responseMimeType: "application/json",
                responseSchema: changeRequestSchema,
            },
        });

        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);
        return result as Omit<ChangeRequest, 'id' | 'status'>;

    } catch (error) {
        console.error("Error calling Gemini API for change request suggestion:", error);
        if (error instanceof Error && error.message.includes('JSON')) {
             throw new Error("AI returned an invalid data format for the change request. Please try again.");
        }
        throw new Error("An error occurred during AI change request suggestion.");
    }
};

export const initializeChatSession = (baselineData: ProcessData, historicalData: ProcessData[]): Chat => {
    const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: `You are an expert diagnostic assistant for analyzing an automotive heated flash process. Your knowledge base includes extensive engineering principles for this specific process. You have been provided with the complete baseline (design) data and all historical readings for the system.

            **DATA STRUCTURE NOTE:** Each 'zone' can have an array of 'subSystems'. The main 'supply' and 'exhaust' objects on a zone represent ductwork and do NOT contain fan motor details. Fan motor data is located within sub-systems: 'AirSupplyHouse' contains a full 'airSystem' object. A 'Cooler' sub-system contains an optional 'fanMotor' object. A 'HeaterBox' sub-system now contains two optional fan motor objects: 'combustionFan' and 'circulationFan'. Associate all fan motor data with its parent sub-system and zone.

            **Your Knowledge Base:**
            ${ENGINEERING_PRINCIPLES}

            **Baseline (Design) Data:**
            ${JSON.stringify(baselineData, null, 2)}
    
            **Historical Onsite Readings (Newest is last):**
            ${JSON.stringify(historicalData, null, 2)}

            **Your Role:**
            - Answer user questions about the process data.
            - Explain potential relationships between different parameters.
            - Clarify faults, trends, and root cause analyses.
            - Be concise and directly reference the data you have been given.
            - If you don't have enough data to answer a question, say so and explain what data you would need.
            - Do not provide the raw JSON data back to the user unless specifically asked. Instead, interpret it for them.
            `
        },
    });
    return chat;
};

export const querySmartAgent = async (chat: Chat, message: string): Promise<string> => {
    try {
        const response = await chat.sendMessage({ message });
        return response.text;
    } catch (error) {
        console.error("Error querying Smart Agent:", error);
        throw new Error("Failed to get a response from the Smart Agent.");
    }
}