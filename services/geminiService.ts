
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
    *   Convert to CFM (cubic feet per minute) of water vapor: 75.06 lbs/hr / 60 min/hr = 1.25 lbs/min. At standard conditions, this is about 21 cfm of pure water vapor. The required airflow will be much higher to keep humidity low.

**2. Humidity Control**
The air must be dry enough to create a vapor pressure differential that drives evaporation.
*   **Consideration:** The target relative humidity inside the flash-off zone is critical. This determines how much moisture the air can absorb.
*   **Sample Calculation:**
    *   Target internal RH: 50% at 150 F
    *   Moisture content at 50% RH, 150 F: ~0.04 lbs of water per lb of dry air.
    *   Moisture content of incoming fresh air: Assume 70% RH at 75 F, which is ~0.013 lbs of water per lb of dry air.
    *   Moisture absorption capacity per lb of air: 0.04 - 0.013 = 0.027 lbs water.
    *   Required mass flow of air: 1.25 lbs water/min / 0.027 lbs water/lb air = 46.3 lbs dry air/min.
    *   Convert to CFM: At standard density (0.075 lbs/ft^3), this is 46.3 / 0.075 = ~617 CFM. This is a simplified calculation; a real one would use psychrometric charts or software.

**3. Temperature Control**
The air must be heated to provide the latent heat of vaporization for the water.
*   **Consideration:** The heater's capacity (BTU/hr) must be sufficient to raise the air temperature and evaporate the water.
*   **Sample Calculation:**
    *   Required heat for air (sensible heat): Mass flow * Specific heat of air * Delta_T
        *   46.3 lbs/min * 60 min/hr * 0.24 BTU/lb-F * (150 F - 75 F) = ~50,000 BTU/hr
    *   Required heat for evaporation (latent heat): Mass flow of water * Latent heat of vaporization
        *   75.06 lbs/hr * ~970 BTU/lb = ~72,800 BTU/hr
    *   Total heat required: 50,000 + 72,800 = ~122,800 BTU/hr (plus system losses).
`;

export const analyzeProcessData = async (baselineData: ProcessData, historicalData: ProcessData[], problemStatement: string): Promise<AIAnalysis> => {
  if (!historicalData || historicalData.length === 0) {
    throw new Error("No historical data available to analyze.");
  }
  
  const model = "gemini-2.5-flash";

  const problemContext = problemStatement 
    ? `The user is investigating the following specific problem: "${problemStatement}". Please focus your analysis primarily on data points, faults, and trends that are most relevant to this specific issue. Use this context to determine the most likely root causes.`
    : `The user has not provided a specific problem statement. Perform a general analysis of the system's health and identify the most critical issues.`;

  const prompt = `
    You are an expert AI for process engineering diagnostics, specializing in industrial paint lines for automotive manufacturing.
    Your task is to analyze process data, identify faults by comparing current readings to a baseline, detect trends over time, and perform a root cause analysis using the provided engineering principles.

    **Problem Context:**
    ${problemContext}

    **Instructions:**
    1.  **Analyze Faults:** Compare the MOST RECENT historical reading to the baseline data. Identify any parameter that deviates by more than 5%.
    2.  **Analyze Trends:** Examine ALL historical readings to identify any parameters that show a consistent upward, downward, or cyclical trend over time.
    3.  **Root Cause Analysis:** Based on the identified faults and trends, use the provided Engineering Principles to determine the most likely root causes. Explain your reasoning clearly.
    4.  **Overall Status:** Summarize the system's health into one of three categories: 'In-Compliance', 'Warning', or 'Critical'.
    5.  **Format Output:** Return the entire analysis as a single JSON object conforming to the provided schema.

    **Engineering Principles Knowledge Base:**
    ---
    ${ENGINEERING_PRINCIPLES}
    ---

    **Data Provided:**
    *   **Baseline Design Data:** This is the target specification for the process.
        \`\`\`json
        ${JSON.stringify(baselineData, null, 2)}
        \`\`\`
    *   **Historical Readings:** A time-series of measurements. The last entry is the most recent.
        \`\`\`json
        ${JSON.stringify(historicalData, null, 2)}
        \`\`\`
  `;

  try {
    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
        },
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText) as AIAnalysis;
  } catch (error) {
    console.error("Gemini API call failed:", error);
    throw new Error(`Failed to get a valid analysis from the AI. The AI response might be blocked or contain malformed JSON. Raw error: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const initializeChatSession = (baselineData: ProcessData, historicalData: ProcessData[], problemStatement: string): Chat => {
  const model = 'gemini-2.5-flash';

  const problemContext = problemStatement 
    ? `The user's primary focus for this investigation is: "${problemStatement}". Always consider this context when answering questions.`
    : ``;

  const systemInstruction = `
    You are an expert process engineering diagnostic assistant. You are helpful, polite, and provide detailed, technical answers based *only* on the data provided and fundamental engineering principles.
    Your knowledge base is the provided baseline data, historical readings, and a set of core engineering principles for paint dehydration. Do not use outside knowledge.
    When asked about trends, compare data points across the different historical readings.
    When asked for calculations, perform them step-by-step and show your work.
    ${problemContext}

    Here is the baseline design data for the system:
    \`\`\`json
    ${JSON.stringify(baselineData, null, 2)}
    \`\`\`
    Here are the historical readings collected over time (the last one is the most recent):
    \`\`\`json
    ${JSON.stringify(historicalData, null, 2)}
    \`\`\`
  `;

  return ai.chats.create({
    model,
    config: {
      systemInstruction,
    },
  });
};

export const querySmartAgent = async (chat: Chat, message: string): Promise<string> => {
    const response = await chat.sendMessage({ message });
    return response.text;
};

const changeRequestSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: "A concise, descriptive title for the change request (e.g., 'Recalibrate Heated Flash Zone Temperature Controller')." },
        justification: { type: Type.STRING, description: "A detailed explanation of why this change is necessary, referencing specific faults and trends from the analysis (e.g., 'Heated Flash Zone temperature is consistently 15°F above baseline, causing...')." },
        recommendedAction: { type: Type.STRING, description: "A step-by-step description of the action to be taken (e.g., '1. Lock out and tag out the heater box. 2. Use a calibrated thermocouple to measure the actual temperature. 3. Adjust the controller offset...')." },
        expectedResults: { type: Type.STRING, description: "The measurable positive outcomes expected after the change is implemented (e.g., 'Temperature deviation will be reduced to less than +/- 2°F from baseline. Reduction in surface blistering by 90%.')." },
        riskLevel: { type: Type.STRING, description: "The assessed risk level of performing the action. Must be 'Low', 'Medium', or 'High'." },
        riskDetails: { type: Type.STRING, description: "A brief description of potential risks and a plan to mitigate them (e.g., 'Risk of minor production downtime. Mitigation: Perform during scheduled weekend maintenance.')." },
        estimatedCost: { type: Type.STRING, description: "A rough estimate of the cost, including labor and materials (e.g., '$500 for 2 hours of technician labor and calibration equipment.')." },
    },
    required: ["title", "justification", "recommendedAction", "expectedResults", "riskLevel", "riskDetails", "estimatedCost"],
};

export const suggestChangeRequest = async (analysis: AIAnalysis, baselineData: ProcessData, historicalData: ProcessData[], problemStatement: string): Promise<Omit<ChangeRequest, 'id' | 'status'>> => {
    const model = 'gemini-2.5-flash';
    const problemContext = problemStatement 
        ? `The primary goal is to address the following user-defined problem: "${problemStatement}". Ensure the suggested change request directly addresses this issue.`
        : `The user has not specified a problem. Base the change request on the most critical fault or trend identified in the analysis.`;

    const prompt = `
        You are an expert AI assistant for process engineering. Based on the provided analysis of an industrial paint line, generate a formal, detailed, and actionable Change Request document.
        
        **Problem Context:**
        ${problemContext}

        **Instructions:**
        1.  Review the entire analysis, including faults, trends, and root cause analysis.
        2.  Identify the single most critical issue or root cause that requires action.
        3.  Formulate a professional and well-structured change request to address this issue.
        4.  Be specific and practical in your recommendations. The output should be ready for a technician or manager to review.
        5.  Return the output as a single JSON object conforming to the provided schema.

        **Analysis Data:**
        \`\`\`json
        ${JSON.stringify({ analysis, baselineData, historicalData }, null, 2)}
        \`\`\`
    `;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: changeRequestSchema,
            },
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Gemini API call for suggestion failed:", error);
        throw new Error(`Failed to get a valid suggestion from the AI. Raw error: ${error instanceof Error ? error.message : String(error)}`);
    }
};
