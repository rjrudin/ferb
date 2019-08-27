package org.example;

import com.marklogic.client.DatabaseClient;
import com.marklogic.client.DatabaseClientFactory;
import com.marklogic.client.eval.EvalResultIterator;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * Generate a CSV file
 * customer_id
 * store_id - 1 or 2, doesn't really matter
 * first_name - slap range index on staging for this
 * last_name - same as above
 * email - generate from first and last name
 * address_id - grab values from staging, pick one
 * active = 1
 * create_date =
 * last_update =
 */
public class CustomerGenerator {

	public static void main(String[] args) throws IOException {
		DatabaseClient client = DatabaseClientFactory.newClient("localhost", 8010,
			new DatabaseClientFactory.DigestAuthContext("admin", "admin"));

		File dir = new File("data-hub/build/raw");
		dir.mkdirs();
		File file = new File(dir, "customer.txt");
		BufferedWriter writer = new BufferedWriter(new FileWriter(file));
		final int limit = 1000000;

		final int nextHighestCustomerId = Integer.parseInt(
			client.newServerEval()
				.javascript("cts.elementValues('customer_id', null, ['limit=1', 'descending', 'item-order'], cts.collectionQuery('customer'))")
				.evalAs(String.class)
		) + 1;

		List<String> firstNames = getListOfValues(client, "cts.elementValues('first_name', null, null, cts.collectionQuery('customer'))");
		List<String> lastNames = getListOfValues(client, "cts.elementValues('last_name', null, null, cts.collectionQuery('customer'))");
		List<String> addressIds = getListOfValues(client, "cts.elementValues('address_id', null, null, cts.collectionQuery('address'))");

		final int firstNameCount = firstNames.size() - 1;
		final int lastNameCount = lastNames.size() - 1;
		final int addressCount = addressIds.size() - 1;

		Random random = new Random(System.currentTimeMillis());

		try {
			for (int i = 1; i <= limit; i++) {
				if (i > 1) {
					writer.write("\n");
				}
				Customer c = new Customer();
				c.id = nextHighestCustomerId + i;
				c.storeId = (i % 2) + 1;
				c.firstName = firstNames.get(random.nextInt(firstNameCount));
				c.lastName = lastNames.get(random.nextInt(lastNameCount));
				c.email = c.firstName + "." + c.lastName + "@sakila.org";
				c.addressId = addressIds.get(random.nextInt(addressCount));
				writer.write(c.toString());
			}
		} finally {
			client.release();
			writer.close();
		}
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

	@Override
	public String toString() {
		return String.format("%d,%d,%s,%s,%s,%s,%s,%s,%s",
			id, storeId, firstName, lastName, email, addressId, active, createDate, lastUpdate);
	}
}
