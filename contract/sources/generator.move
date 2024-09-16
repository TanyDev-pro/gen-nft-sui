/// The flatland NFT game project.
module generator::generator;

use std::string::String;
use sui::address;
use sui::display;
use sui::package;

const BASE36: vector<u8> = b"0123456789abcdefghijklmnopqrstuvwxyz";
const VISUALIZATION_SITE: address =
    @0xc1a87ae29ed643bb85be2261fbcf0ce016443fa0eddbec2d172d01bbf3b62448;

public struct GeneratedNFT has key, store {
    id: UID,
    image_url: String,
    b36addr: String,
    image_blob_id: String,
    description: String,
}

// OTW for display.
public struct GENERATOR has drop {}

fun init(otw: GENERATOR, ctx: &mut TxContext) {
    let publisher = package::claim(otw, ctx);
    let mut display = display::new<GeneratedNFT>(&publisher, ctx);

    display.add(
        b"link".to_string(),
        b"https://{b36addr}.walrus.site".to_string(),
    );
    display.add(
        b"image_url".to_string(),
        b"{image_url}".to_string(),
    );
    display.add(
        b"walrus site address".to_string(),
        VISUALIZATION_SITE.to_string(),
    );
    display.update_version();

    transfer::public_transfer(publisher, ctx.sender());
    transfer::public_transfer(display, ctx.sender());
}

entry fun mint(image_blob_id : String, description : String, ctx: &mut TxContext) {
    let nft = new( image_blob_id, description, ctx);
    transfer::transfer(nft, tx_context::sender(ctx));
}

fun new(image_blob_id : String, description : String, ctx: &mut TxContext): GeneratedNFT {
    let id = object::new(ctx);
    let b36addr = to_b36(id.uid_to_address());
    let image_url = b"https://i.ibb.co/YD90Smd/walrus.png".to_string();
    GeneratedNFT {
        id,
        image_url,
        b36addr,
        image_blob_id,
        description
    }
}



// fun num_to_ascii(mut num: u64): vector<u8> {
//     let mut res = vector[];
//     if (num == 0) return vector[48];
//     while (num > 0) {
//         let digit = (num % 10) as u8;
//         num = num / 10;
//         res.insert(digit + 48, 0);
//     };
//     res //
// }

public fun to_b36(addr: address): String {
    let source = address::to_bytes(addr);
    let size = 2 * vector::length(&source);
    let b36copy = BASE36;
    let base = vector::length(&b36copy);
    let mut encoding = vector::tabulate!(size, |_| 0);
    let mut high = size - 1;

    source.length().do!(|j| {
        let mut carry = source[j] as u64;
        let mut it = size - 1;
        while (it > high || carry != 0) {
            carry = carry + 256 * (encoding[it] as u64);
            let value = (carry % base) as u8;
            *&mut encoding[it] = value;
            carry = carry / base;
            it = it - 1;
        };
        high = it;
    });

    let mut str: vector<u8> = vector[];
    let mut k = 0;
    let mut leading_zeros = true;
    while (k < vector::length(&encoding)) {
        let byte = encoding[k] as u64;
        if (byte != 0 && leading_zeros) {
            leading_zeros = false;
        };
        let char = b36copy[byte];
        if (!leading_zeros) {
            str.push_back(char);
        };
        k = k + 1;
    };
    str.to_string()
}