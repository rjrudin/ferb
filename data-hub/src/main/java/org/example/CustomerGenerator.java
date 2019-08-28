package org.example;

import com.marklogic.client.DatabaseClient;
import com.marklogic.client.DatabaseClientFactory;
import com.marklogic.client.eval.EvalResultIterator;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Random;

/**
 * Okay - we need many payments per customer. Let's do a random number of 1 to 50. For each one, we'll assign a rental
 * ID based on one of the existing rental IDs.
 */
public class CustomerGenerator {

	public static void main(String[] args) throws IOException {
		String host = args[0];
		String username = args[1];
		String password = args[2];
		int limit = Integer.parseInt(args[3]);
		int paymentCounter = 0;

		DatabaseClient client = DatabaseClientFactory.newClient(host, 8010,
			new DatabaseClientFactory.DigestAuthContext(username, password));

		File dir = new File("build/raw");
		dir.mkdirs();

		File customerFile = new File(dir, "customer.txt");
		BufferedWriter customerWriter = new BufferedWriter(new FileWriter(customerFile));
		customerWriter.write("customer_id,store_id,first_name,last_name,email,address_id,active,create_date,last_update," +
			"language_id,category_id,generated");

		File paymentFile = new File(dir, "payment.txt");
		BufferedWriter paymentWriter = new BufferedWriter(new FileWriter(paymentFile));
		paymentWriter.write("payment_id,customer_id,staff_id,rental_id,amount,payment_date,last_update,generated");

		final int nextHighestCustomerId = Integer.parseInt(
			client.newServerEval()
				.javascript("cts.elementValues('customer_id', null, ['limit=1', 'descending', 'item-order'], cts.collectionQuery('customer'))")
				.evalAs(String.class)
		) + 1;

		final int nextHighestPaymentId = Integer.parseInt(
			client.newServerEval()
				.javascript("cts.estimate(cts.collectionQuery('payment'))")
				.evalAs(String.class)
		) + 1;

		List<String> firstNames = getListOfValues(client, "cts.elementValues('first_name', null, null, cts.collectionQuery('customer'))");
		List<String> lastNames = getListOfValues(client, "cts.elementValues('last_name', null, null, cts.collectionQuery('customer'))");
		List<String> addressIds = getListOfValues(client, "cts.elementValues('address_id', null, null, cts.collectionQuery('address'))");

		// Building rentalIds manually, as we know how many there are, and we just need a few.
		// And there's no range index on rental_id since it's null in some tables.
		List<Integer> rentalIds = new ArrayList<>();
		for (int i = 1; i <= 10000; i++) {
			rentalIds.add(i);
		}

		final int firstNameCount = firstNames.size() - 1;
		final int lastNameCount = lastNames.size() - 1;
		final int addressCount = addressIds.size() - 1;
		final int rentalCount = rentalIds.size() - 1;

		Random random = new Random(System.currentTimeMillis());

		try {
			for (int i = 1; i <= limit; i++) {
				customerWriter.write("\n");
				Customer c = new Customer();
				c.id = nextHighestCustomerId + i;
				c.storeId = (i % 2) + 1;
				c.firstName = firstNames.get(random.nextInt(firstNameCount));
				c.lastName = lastNames.get(random.nextInt(lastNameCount));
				c.email = c.firstName + "." + c.lastName + "@sakila.org";
				c.addressId = addressIds.get(random.nextInt(addressCount));
				c.languageId = random.nextInt(6) + 1;
				c.categoryId = random.nextInt(16) + 1;
				customerWriter.write(c.toString());

				int paymentCount = random.nextInt(50) + 1;
				for (int j = 1; j <= paymentCount; j++) {
					paymentWriter.write("\n");
					Payment p = new Payment();
					p.amount = "2.99"; // doesn't matter
					p.customerId = c.id;
					paymentCounter++;
					p.paymentId = nextHighestPaymentId + paymentCounter;
					p.rentalId = rentalIds.get(random.nextInt(rentalCount));
					p.staffId = (i % 2) + 1;
					paymentWriter.write(p.toString());
				}
			}
		} finally {
			client.release();
			customerWriter.close();
			paymentWriter.close();
		}

		System.out.println("Wrote file: " + customerFile.getAbsolutePath());
		System.out.println("Customer count: " + limit);
		System.out.println("Wrote file: " + paymentFile.getAbsolutePath());
		System.out.println("Payment count: " + paymentCounter);
	}

	private static List<String> getListOfValues(DatabaseClient client, String query) {
		List<String> list = new ArrayList<>();
		EvalResultIterator iter = client.newServerEval()
			.javascript(query)
			.eval();
		while (iter.hasNext()) {
			list.add(iter.next().getString());
		}
		return list;
	}
}

class Customer {

	public int id;
	public int storeId;
	public String firstName;
	public String lastName;
	public String email;
	public String addressId;
	public String active = "1";
	public String createDate;
	public String lastUpdate;
	public int languageId;
	public int categoryId;

	@Override
	public String toString() {
		return String.format("%d,%d,%s,%s,%s,%s,%s,%s,%s,%d,%d,true",
			id, storeId, firstName, lastName, email, addressId, active, createDate, lastUpdate, languageId, categoryId);
	}
}

class Payment {
	public int paymentId;
	public int customerId;
	public int staffId;
	public int rentalId;
	public String amount;
	public String paymentDate;
	public String lastUpdate;

	@Override
	public String toString() {
		return String.format("%d,%d,%d,%d,%s,%s,%s,true",
			paymentId, customerId, staffId, rentalId, amount, paymentDate, lastUpdate);
	}
}
