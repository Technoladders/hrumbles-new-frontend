// frontend
// Sample filtered, sorted, and calculated data
const reportData = [
  { id: 1, name: "Item 1", value: 100 },
  { id: 2, name: "Item 2", value: 200 },
  // ... more data
];

async function sendReport() {
  const response = await fetch("https://your-edge-function-url/send-daily-report", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(reportData),
  });

  if (response.ok) {
    console.log("Report sent successfully!");
  } else {
    console.error("Failed to send report:", await response.text());
  }
}

// Call sendReport() when you want to send the report

// Call sendReport() when you want to send the report

// Backend Edge function
import { serve } from "std/http";
import { SendMailClient } from "zeptomail";

const url = "https://api.zeptomail.in/";
const token = "Zoho-enczapikey"; // Replace with your actual token

const client = new SendMailClient({ url, token });

serve(async (req) => {
  // Parse the incoming JSON data
  const reportData = await req.json();

  // Format the data for the email content
  const reportContent = reportData.map(row => {
    return `ID: ${row.id}, Name: ${row.name}, Value: ${row.value}`; // Adjust based on your data structure
  }).join("<br>"); // Use <br> for HTML formatting

  const emailData = {
    from: {
      address: "no-reply@hrumbles.ai",
      name: "noreply",
    },
    to: [
      {
        email_address: {
          address: "recipient@example.com", // Replace with the actual recipient's email
          name: "Recipient Name",
        },
      },
    ],
    subject: "Daily Report",
    htmlbody: `<div><b>Here is your daily report:</b><br>${reportContent}</div>`,
  };

  try {
    const resp = await client.sendMail(emailData);
    return new Response("Email sent successfully!", { status: 200 });
  } catch (error) {
    console.error("Error sending email:", error);
    return new Response(`Failed to send email: ${error.message}`, { status: 500 });
  }
});